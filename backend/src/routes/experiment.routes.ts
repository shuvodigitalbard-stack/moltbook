// Experiment Routes
import { Router, Response } from 'express';
import { experimentService } from '../services/experiment.service';
import { authenticate, requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const experiments = await experimentService.getByTeam(req.user!.teamId.toString());
    res.json({ experiments });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/', requireAuth('admin', 'architect'), async (req: AuthRequest, res: Response) => {
  try {
    const experiment = await experimentService.create({
      ...req.body,
      teamId: req.user!.teamId.toString(),
      userId: req.userId!,
    });
    res.status(201).json({ experiment });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const experiment = await experimentService.getById(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }
    res.json({ experiment });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/start', requireAuth('admin', 'architect'), async (req: AuthRequest, res: Response) => {
  try {
    const experiment = await experimentService.start(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }
    res.json({ experiment });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/complete', requireAuth('admin', 'architect'), async (req: AuthRequest, res: Response) => {
  try {
    const experiment = await experimentService.complete(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }
    res.json({ experiment });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;
