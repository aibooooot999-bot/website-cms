import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDashboardStats, getActivityLogs, getActivityLogsCount } from './database.js';
import { authenticate, AuthRequest, requirePermission } from './auth.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import pagesRoutes from './routes/pages.js';
import uploadRoutes from './routes/upload.js';
import mediaRoutes from './routes/media.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 靜態檔案服務（上傳的圖片）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 初始化資料庫（async）
await initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/upload', authenticate, uploadRoutes);
app.use('/api/media', authenticate, mediaRoutes);

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
    const offset = parseInt(req.query.offset as string) || 0;
    const logs = getActivityLogs(limit, offset);
    const total = getActivityLogsCount();
    res.json({ success: true, data: logs, total });
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
