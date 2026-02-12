import express from 'express';
import cors from 'cors';
import { initDatabase, getDashboardStats, getActivityLogs } from './database.js';
import { authenticate, AuthRequest, requirePermission } from './auth.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import pagesRoutes from './routes/pages.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 初始化資料庫（async）
await initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/pages', pagesRoutes);

// Dashboard Stats
app.get('/api/dashboard/stats', authenticate, (req, res) => {
  try {
    const stats = getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Activity Logs
app.get('/api/dashboard/activities', authenticate, requirePermission('logs.view'), (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const logs = getActivityLogs(limit);
    res.json({ success: true, data: logs });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'Website CMS API',
    version: '1.0.0',
    endpoints: {
      'POST /api/auth/login': '登入',
      'GET /api/auth/me': '取得目前使用者',
      'GET /api/users': '使用者列表',
      'GET /api/roles': '角色列表',
      'GET /api/pages': '頁面列表',
      'GET /api/dashboard/stats': '儀表板統計',
    }
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(500).json({ success: false, error: err.message || '伺服器錯誤' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🏢 Website CMS API 已啟動
📍 http://localhost:${PORT}
📚 API: http://localhost:${PORT}/api

預設管理員帳號:
  帳號: admin
  密碼: admin123
  `);
});
