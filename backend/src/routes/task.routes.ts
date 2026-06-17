// Task Routes
import { Router, Response } from 'express';
import { taskService } from '../services/task.service';
import { authenticate, requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const tasks = await taskService.getByTeam(
      req.user!.teamId.toString(),
      status as string | undefined
    );
    res.json({ tasks });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/', requireAuth('admin', 'architect', 'analyst'), async (req: AuthRequest, res: Response) => {
  try {
    const task = await taskService.create({
      ...req.body,
      teamId: req.user!.teamId.toString(),
      userId: req.userId!,
    });
    res.status(201).json({ task });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await taskService.getById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ task });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const task = await taskService.updateStatus(req.params.id, status, req.userId!);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ task });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/:id/export', async (req: AuthRequest, res: Response) => {
  try {
    const task = await taskService.getById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    const format = req.query.format || 'markdown';
    let content = '';
    let contentType = 'text/plain';

    switch (format) {
      case 'markdown':
        content = `# ${task.title}\n\n**Type:** ${task.type}\n**Status:** ${task.status}\n\n## Input\n${task.inputText}\n\n## Output\n${task.output}`;
        contentType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify(task.toObject(), null, 2);
        contentType = 'application/json';
        break;
      default:
        content = task.output;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="task-${task._id}.${format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt'}"`);
    res.send(content);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;
