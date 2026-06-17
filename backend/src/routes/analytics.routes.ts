// Analytics Routes
import { Router, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const analytics = await analyticsService.getUsage(req.user!.teamId.toString(), days);
    res.json(analytics);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;
