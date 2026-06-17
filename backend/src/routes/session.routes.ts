// Session Routes - SQLite version
import { Router, Response } from 'express';
import { sessionService } from '../services/session.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await sessionService.getByUser(req.user!.id, 20);
    res.json({ sessions });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await sessionService.getActive(req.user!.team_id);
    res.json({ sessions });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const session = await sessionService.getById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/inject', rateLimiter(20, 60000), async (req: AuthRequest, res: Response) => {
  try {
    const { injectionText, injectionRole } = req.body;
    if (!injectionText) {
      res.status(400).json({ error: 'Injection text required' });
      return;
    }
    const session = await sessionService.injectPrompt(req.params.id, injectionText, injectionRole || 'system', req.user!.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/:id/memory', async (req: AuthRequest, res: Response) => {
  try {
    const memory = await sessionService.getMemory(req.params.id);
    res.json({ memory });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.put('/:id/memory', async (req: AuthRequest, res: Response) => {
  try {
    const { key, value, scope } = req.body;
    if (!key) {
      res.status(400).json({ error: 'Key required' });
      return;
    }
    const session = await sessionService.updateMemory(req.params.id, key, value, scope || 'session');
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ memory: JSON.parse(session.memory) });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/:id/context', async (req: AuthRequest, res: Response) => {
  try {
    const session = await sessionService.getById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ messages: JSON.parse(session.messages) });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.put('/:id/context', async (req: AuthRequest, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array required' });
      return;
    }
    const session = await sessionService.updateContext(req.params.id, messages);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ messages: JSON.parse(session.messages) });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/decision', async (req: AuthRequest, res: Response) => {
  try {
    const { nodeId, choice } = req.body;
    if (!nodeId || !choice) {
      res.status(400).json({ error: 'nodeId and choice required' });
      return;
    }
    const session = await sessionService.handleDecision(req.params.id, nodeId, choice);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;
