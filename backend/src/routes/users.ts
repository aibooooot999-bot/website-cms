import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import {
  getAllUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  logActivity
} from '../database.js';
import { authenticate, requirePermission, AuthRequest } from '../auth.js';

const router = Router();

// 取得所有使用者
router.get('/', authenticate, requirePermission('users.view'), (req, res) => {
  try {
    const users = getAllUsers();
    res.json({ success: true, data: users });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 取得單一使用者
router.get('/:id', authenticate, requirePermission('users.view'), (req, res) => {
  try {
    const id = req.params.id as string;
    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '使用者不存在' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        role_id: user.role_id,
        role_name: user.role_name,
        role_display_name: user.role_display_name,
        last_login: user.last_login,
        created_at: user.created_at
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 建立使用者
router.post('/', authenticate, requirePermission('users.create'), (req: AuthRequest, res) => {
  try {
    const { username, password, display_name, email, role_id } = req.body;

    if (!username || !password || !role_id) {
      return res.status(400).json({ success: false, error: '請填寫必要欄位' });
    }

    // 檢查帳號是否已存在
    const existing = getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ success: false, error: '帳號已存在' });
    }

    const id = 'user_' + uuid();
    const password_hash = bcrypt.hashSync(password, 10);

    createUser({
      id,
      username,
      password_hash,
      display_name,
      email,
      role_id
    });

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'user.create',
      target_type: 'user',
      target_id: id,
      details: `建立使用者: ${username}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    const user = getUserById(id);
    res.json({ success: true, data: user, message: '使用者已建立' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 更新使用者
router.put('/:id', authenticate, requirePermission('users.edit'), (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { display_name, email, avatar, role_id, status } = req.body;

    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '使用者不存在' });
    }

    updateUser(id, { display_name, email, avatar, role_id, status });

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'user.update',
      target_type: 'user',
      target_id: id,
      details: `更新使用者: ${user.username}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    const updatedUser = getUserById(id);
    res.json({ success: true, data: updatedUser, message: '使用者已更新' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 變更密碼
router.put('/:id/password', authenticate, (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { current_password, new_password } = req.body;

    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '使用者不存在' });
    }

    // 只有本人或有權限的管理員可以修改密碼
    const isSelf = req.user!.id === id;
    const hasPermission = req.user!.permissions.includes('*') || req.user!.permissions.includes('users.edit');

    if (!isSelf && !hasPermission) {
      return res.status(403).json({ success: false, error: '權限不足' });
    }

    // 本人修改時需要驗證目前密碼
    if (isSelf && current_password) {
      const isValid = bcrypt.compareSync(current_password, user.password_hash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: '目前密碼錯誤' });
      }
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, error: '新密碼至少需要 6 個字元' });
    }

    const password_hash = bcrypt.hashSync(new_password, 10);
    updateUserPassword(id, password_hash);

    res.json({ success: true, message: '密碼已更新' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 刪除使用者
router.delete('/:id', authenticate, requirePermission('users.delete'), (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '使用者不存在' });
    }

    // 不能刪除自己
    if (req.user!.id === id) {
      return res.status(400).json({ success: false, error: '無法刪除自己的帳號' });
    }

    deleteUser(id);

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'user.delete',
      target_type: 'user',
      target_id: id,
      details: `刪除使用者: ${user.username}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    res.json({ success: true, message: '使用者已刪除' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
