// Agent Routes - SQLite version
import { Router, Response } from 'express';
import { agentService } from '../services/agent.service';
import { authenticate, requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const agents = await agentService.getByTeam(req.user!.team_id);
    res.json({ agents });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch agents' });
  }
});

router.post('/', requireAuth('admin', 'architect'), async (req: AuthRequest, res: Response) => {
  try {
    const agent = await agentService.create({
      ...req.body,
      teamId: req.user!.team_id,
      userId: req.user!.id,
    });
    res.status(201).json({ agent });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create agent' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await agentService.getById(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ agent });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch agent' });
  }
});

router.put('/:id', requireAuth('admin', 'architect'), async (req: AuthRequest, res: Response) => {
  try {
    const agent = await agentService.update(req.params.id, req.body, req.user!.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ agent });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update agent' });
  }
});

router.delete('/:id', requireAuth('admin', 'architect'), async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await agentService.delete(req.params.id, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ message: 'Agent deleted' });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete agent' });
  }
});

router.post('/:id/versions', requireAuth('admin', 'architect'), async (req: AuthRequest, res: Response) => {
  try {
    const { tag } = req.body;
    const agent = await agentService.saveVersion(req.params.id, tag || 'draft', req.user!.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ agent });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to save version' });
  }
});

export default router;
