// Auth Service - SQLite version
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { config } from '../utils/config';
import { getDB, getOne, run, genId, saveDB } from '../utils/db';

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
  async register(input: RegisterInput, ipAddress?: string): Promise<{ user: any; tokens: TokenPair }> {
    const { email, password, name, inviteCode } = input;
    const db = await getDB();

    // Check if user exists
    const existing = getOne(db, 'SELECT id FROM users WHERE email = ?', [email]);
    if (existing) throw new Error('Email already registered');

    // Find or create team
    let teamId: string;
    if (inviteCode) {
      const team = getOne(db, 'SELECT id FROM teams WHERE invite_code = ?', [inviteCode]);
      if (!team) throw new Error('Invalid invite code');
      teamId = team.id as string;
    } else {
      teamId = genId();
      const teamCode = crypto.randomBytes(8).toString('hex');
      run(db, 'INSERT INTO teams (id, name, invite_code) VALUES (?, ?, ?)', [teamId, `${name}'s Team`, teamCode]);
    }

    // Create user
    const userId = genId();
    const passwordHash = await bcrypt.hash(password, 12);
    run(db, 'INSERT INTO users (id, email, password_hash, name, role, team_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email, passwordHash, name, 'admin', teamId]);

    const tokens = this.generateTokenPair(userId, 'admin', teamId);
    saveDB(db);

    return {
      user: { id: userId, email, name, role: 'admin', teamId },
      tokens,
    };
  }

  async login(input: LoginInput, ipAddress?: string): Promise<{ user: any; tokens: TokenPair }> {
    const { email, password } = input;
    const db = await getDB();

    const user = getOne(db, 'SELECT * FROM users WHERE email = ?', [email]);
    if (!user) throw new Error('Invalid email or password');
    if (!user.is_active) throw new Error('Account is deactivated');

    const isValid = await bcrypt.compare(password, user.password_hash as string);
    if (!isValid) throw new Error('Invalid email or password');

    // Update last login
    run(db, 'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?', [user.id]);
    saveDB(db);

    const tokens = this.generateTokenPair(user.id as string, user.role as string, user.team_id as string);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, teamId: user.team_id },
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as { userId: string; type: string };
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');

    const db = await getDB();
    const user = getOne(db, 'SELECT * FROM users WHERE id = ? AND is_active = 1', [decoded.userId]);
    if (!user) throw new Error('User not found');

    return this.generateTokenPair(user.id as string, user.role as string, user.team_id as string);
  }

  private generateTokenPair(userId: string, role: string, teamId: string): TokenPair {
    const accessToken = jwt.sign({ userId, role, teamId, type: 'access' }, config.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwtSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
