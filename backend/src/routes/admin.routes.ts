// Admin Routes
import { Router, Response } from 'express';
import { User } from '../models/User';
import { ApiKey } from '../models/ApiKey';
import { AuditLog } from '../models/AuditLog';
import { authenticate, requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(requireAuth('admin'));

// Team users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ teamId: req.user!.teamId }).select('-passwordHash');
    res.json({ users });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

// API Keys
router.get('/apikeys', async (req: AuthRequest, res: Response) => {
  try {
    const keys = await ApiKey.find({ teamId: req.user!.teamId }).select('-encryptedKey -iv -salt');
    res.json({ apiKeys: keys });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/apikeys', async (req: AuthRequest, res: Response) => {
  try {
    const { provider, apiKey, label } = req.body;
    if (!provider || !apiKey) {
      res.status(400).json({ error: 'Provider and API key required' });
      return;
    }
    const key = await ApiKey.create({
      teamId: req.user!.teamId,
      provider,
      encryptedKey: apiKey, // Will be encrypted by pre-save hook
      iv: '', // Will be set by pre-save hook
      salt: '', // Will be set by pre-save hook
      label: label || provider,
    });
    res.status(201).json({ apiKey: { id: key._id, provider: key.provider, label: key.label } });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.delete('/apikeys/:id', async (req: AuthRequest, res: Response) => {
  try {
    await ApiKey.findByIdAndDelete(req.params.id);
    res.json({ message: 'API key deleted' });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

// Audit Logs
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await AuditLog.find({ userId: req.user!._id })
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json({ logs });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;
