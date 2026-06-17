// Auth Service
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { Team } from '../models/Team';
import { config } from '../utils/config';
import { createAuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth.middleware';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  inviteCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput, ipAddress?: string): Promise<{ user: IUser; tokens: TokenPair }> {
    const { email, password, name, inviteCode } = input;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Find or create team
    let teamId: string;
    if (inviteCode) {
      const team = await Team.findOne({ inviteCode });
      if (!team) {
        throw new Error('Invalid invite code');
      }
      teamId = team._id.toString();
    } else {
      // Create new team for first user
      const teamCode = crypto.randomBytes(8).toString('hex');
      const team = await Team.create({
        name: `${name}'s Team`,
        inviteCode: teamCode,
      });
      teamId = team._id.toString();
    }

    // Create user
    const user = await User.create({
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      name,
      role: 'admin', // First user is admin
      teamId,
    });

    const tokens = this.generateTokenPair(user._id.toString(), user.role, teamId);

    // Audit log
    await createAuditLog(user._id, 'user.register', 'User', user._id, { email }, ipAddress);

    return { user, tokens };
  }

  /**
   * Login user
   */
  async login(input: LoginInput, ipAddress?: string): Promise<{ user: IUser; tokens: TokenPair }> {
    const { email, password } = input;

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const tokens = this.generateTokenPair(
      user._id.toString(),
      user.role,
      user.teamId.toString()
    );

    await createAuditLog(user._id, 'user.login', 'User', user._id, { email }, ipAddress);

    return { user, tokens };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as {
        userId: string;
        type: string;
      };

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      return this.generateTokenPair(
        user._id.toString(),
        user.role,
        user.teamId.toString()
      );
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Generate JWT token pair
   */
  private generateTokenPair(userId: string, role: string, teamId: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, role, teamId, type: 'access' },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
