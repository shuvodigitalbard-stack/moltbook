// Admin Routes - SQLite version
import { Router, Response } from 'express';
import { getDB, getAll, getOne, run, saveDB } from '../utils/db';
import { authenticate, requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(requireAuth('admin'));

// Team users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    const users = getAll(db, 'SELECT id, email, name, role, team_id, is_active, last_login, created_at FROM users WHERE team_id = ?', [req.user!.team_id]);
    res.json({ users });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

// Audit Logs
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = getAll(db, 'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?', [req.user!.id, limit]);
    res.json({ logs });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;
