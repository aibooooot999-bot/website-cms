import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getUserByUsername, updateUserLastLogin, logActivity } from '../database.js';
import { generateToken, authenticate, AuthRequest } from '../auth.js';

const router = Router();

// 登入
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '請輸入帳號和密碼' });
    }

    const user = getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, error: '帳號或密碼錯誤' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ success: false, error: '帳號已停用' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: '帳號或密碼錯誤' });
    }

    // 更新最後登入時間
    updateUserLastLogin(user.id);

    // 記錄登入活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: user.id,
      action: 'login',
      details: '使用者登入',
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      roleId: user.role_id
    });

    // 解析權限
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(user.role_permissions || '[]');
    } catch {
      permissions = [];
    }

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          avatar: user.avatar,
          role: {
            id: user.role_id,
            name: user.role_name,
            display_name: user.role_display_name
          },
          permissions
        }
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 取得目前使用者資訊
router.get('/me', authenticate, (req: AuthRequest, res) => {
  try {
    const user = getUserByUsername(req.user!.username);
    if (!user) {
      return res.status(404).json({ success: false, error: '使用者不存在' });
    }

    let permissions: string[] = [];
    try {
      permissions = JSON.parse(user.role_permissions || '[]');
    } catch {
      permissions = [];
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        avatar: user.avatar,
        role: {
          id: user.role_id,
          name: user.role_name,
          display_name: user.role_display_name
        },
        permissions
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 登出（前端清除 Token 即可，這裡只記錄日誌）
router.post('/logout', authenticate, (req: AuthRequest, res) => {
  try {
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'logout',
      details: '使用者登出',
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    res.json({ success: true, message: '已登出' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
