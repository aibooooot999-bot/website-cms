import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  logActivity
} from '../database.js';
import { authenticate, requirePermission, AuthRequest, getAllPermissions } from '../auth.js';

const router = Router();

// 取得所有權限列表
router.get('/permissions', authenticate, requirePermission('roles.view'), (req, res) => {
  try {
    const permissions = getAllPermissions();
    res.json({ success: true, data: permissions });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 取得所有角色
router.get('/', authenticate, requirePermission('roles.view'), (req, res) => {
  try {
    const roles = getAllRoles().map((role: any) => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]')
    }));
    res.json({ success: true, data: roles });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 取得單一角色
router.get('/:id', authenticate, requirePermission('roles.view'), (req, res) => {
  try {
    const id = req.params.id as string;
    const role = getRoleById(id) as any;
    if (!role) {
      return res.status(404).json({ success: false, error: '角色不存在' });
    }

    res.json({
      success: true,
      data: {
        ...role,
        permissions: JSON.parse(role.permissions || '[]')
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 建立角色
router.post('/', authenticate, requirePermission('roles.manage'), (req: AuthRequest, res) => {
  try {
    const { name, display_name, description, permissions } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ success: false, error: '請填寫必要欄位' });
    }

    const id = 'role_' + uuid();
    createRole({
      id,
      name,
      display_name,
      description,
      permissions: permissions || []
    });

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'role.create',
      target_type: 'role',
      target_id: id,
      details: `建立角色: ${display_name}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    const role = getRoleById(id) as any;
    res.json({
      success: true,
      data: { ...role, permissions: JSON.parse(role.permissions || '[]') },
      message: '角色已建立'
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 更新角色
router.put('/:id', authenticate, requirePermission('roles.manage'), (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { display_name, description, permissions } = req.body;

    const role = getRoleById(id) as any;
    if (!role) {
      return res.status(404).json({ success: false, error: '角色不存在' });
    }

    if (role.is_system) {
      return res.status(400).json({ success: false, error: '系統角色無法修改' });
    }

    updateRole(id, { display_name, description, permissions });

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'role.update',
      target_type: 'role',
      target_id: id,
      details: `更新角色: ${role.display_name}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    const updatedRole = getRoleById(id) as any;
    res.json({
      success: true,
      data: { ...updatedRole, permissions: JSON.parse(updatedRole.permissions || '[]') },
      message: '角色已更新'
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 刪除角色
router.delete('/:id', authenticate, requirePermission('roles.manage'), (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const role = getRoleById(id) as any;
    if (!role) {
      return res.status(404).json({ success: false, error: '角色不存在' });
    }

    if (role.is_system) {
      return res.status(400).json({ success: false, error: '系統角色無法刪除' });
    }

    deleteRole(id);

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'role.delete',
      target_type: 'role',
      target_id: id,
      details: `刪除角色: ${role.display_name}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    res.json({ success: true, message: '角色已刪除' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
