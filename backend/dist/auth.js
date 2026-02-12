import jwt from 'jsonwebtoken';
import { getUserById } from './database.js';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
// 生成 JWT Token
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
// 驗證 JWT Token
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
// 認證中介層
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: '未提供認證令牌' });
    }
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ success: false, error: '無效或過期的令牌' });
    }
    const user = getUserById(payload.userId);
    if (!user || user.status !== 'active') {
        return res.status(401).json({ success: false, error: '使用者不存在或已停用' });
    }
    // 解析權限
    let permissions = [];
    try {
        permissions = JSON.parse(user.role_permissions || '[]');
    }
    catch {
        permissions = [];
    }
    req.user = {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name,
        permissions
    };
    next();
}
// 權限檢查中介層
export function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: '未認證' });
        }
        const userPermissions = req.user.permissions;
        // 超級管理員擁有所有權限
        if (userPermissions.includes('*')) {
            return next();
        }
        // 檢查是否擁有所需權限
        const hasPermission = requiredPermissions.some(required => {
            // 完全匹配
            if (userPermissions.includes(required))
                return true;
            // 萬用字元匹配 (e.g., pages.* 匹配 pages.create)
            const [category] = required.split('.');
            if (userPermissions.includes(`${category}.*`))
                return true;
            return false;
        });
        if (!hasPermission) {
            return res.status(403).json({ success: false, error: '權限不足' });
        }
        next();
    };
}
// 取得所有可用權限列表
export function getAllPermissions() {
    return [
        { id: 'pages.view', name: '檢視頁面', category: '頁面管理' },
        { id: 'pages.create', name: '建立頁面', category: '頁面管理' },
        { id: 'pages.edit', name: '編輯頁面', category: '頁面管理' },
        { id: 'pages.delete', name: '刪除頁面', category: '頁面管理' },
        { id: 'pages.publish', name: '發布頁面', category: '頁面管理' },
        { id: 'media.view', name: '檢視媒體', category: '媒體庫' },
        { id: 'media.upload', name: '上傳媒體', category: '媒體庫' },
        { id: 'media.delete', name: '刪除媒體', category: '媒體庫' },
        { id: 'users.view', name: '檢視使用者', category: '使用者管理' },
        { id: 'users.create', name: '建立使用者', category: '使用者管理' },
        { id: 'users.edit', name: '編輯使用者', category: '使用者管理' },
        { id: 'users.delete', name: '刪除使用者', category: '使用者管理' },
        { id: 'roles.view', name: '檢視角色', category: '角色管理' },
        { id: 'roles.manage', name: '管理角色', category: '角色管理' },
        { id: 'settings.view', name: '檢視設定', category: '系統設定' },
        { id: 'settings.edit', name: '編輯設定', category: '系統設定' },
        { id: 'logs.view', name: '檢視日誌', category: '系統日誌' },
    ];
}
