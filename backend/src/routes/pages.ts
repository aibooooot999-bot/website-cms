import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
  getAllPages,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  logActivity
} from '../database.js';
import { authenticate, requirePermission, AuthRequest } from '../auth.js';

const router = Router();

// 取得所有頁面
router.get('/', authenticate, requirePermission('pages.view'), (req, res) => {
  try {
    const pages = getAllPages();
    res.json({ success: true, data: pages });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 取得單一頁面
router.get('/:id', authenticate, requirePermission('pages.view'), (req, res) => {
  try {
    const id = req.params.id as string;
    const page = getPageById(id);
    if (!page) {
      return res.status(404).json({ success: false, error: '頁面不存在' });
    }
    res.json({ success: true, data: page });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 建立頁面
router.post('/', authenticate, requirePermission('pages.create'), (req: AuthRequest, res) => {
  try {
    const { title, slug, content, excerpt, status, template, meta_title, meta_description } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ success: false, error: '請填寫標題和網址代稱' });
    }

    // 檢查 slug 是否重複
    const existing = getPageBySlug(slug);
    if (existing) {
      return res.status(400).json({ success: false, error: '網址代稱已存在' });
    }

    const id = 'page_' + uuid();
    createPage({
      id,
      title,
      slug,
      content,
      excerpt,
      status,
      template,
      meta_title,
      meta_description,
      created_by: req.user!.id
    });

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'page.create',
      target_type: 'page',
      target_id: id,
      details: `建立頁面: ${title}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    const page = getPageById(id);
    res.json({ success: true, data: page, message: '頁面已建立' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 更新頁面
router.put('/:id', authenticate, requirePermission('pages.edit'), (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { title, slug, content, excerpt, featured_image, status, template, sort_order, meta_title, meta_description } = req.body;

    const page = getPageById(id) as any;
    if (!page) {
      return res.status(404).json({ success: false, error: '頁面不存在' });
    }

    // 檢查 slug 是否重複（排除自己）
    if (slug && slug !== page.slug) {
      const existing = getPageBySlug(slug);
      if (existing) {
        return res.status(400).json({ success: false, error: '網址代稱已存在' });
      }
    }

    // 檢查發布權限
    if (status === 'published' && !req.user!.permissions.includes('*') && !req.user!.permissions.includes('pages.publish') && !req.user!.permissions.includes('pages.*')) {
      return res.status(403).json({ success: false, error: '沒有發布權限' });
    }

    updatePage(id, {
      title,
      slug,
      content,
      excerpt,
      featured_image,
      status,
      template,
      sort_order,
      meta_title,
      meta_description,
      updated_by: req.user!.id
    });

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'page.update',
      target_type: 'page',
      target_id: id,
      details: `更新頁面: ${title || page.title}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    const updatedPage = getPageById(id);
    res.json({ success: true, data: updatedPage, message: '頁面已更新' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 刪除頁面
router.delete('/:id', authenticate, requirePermission('pages.delete'), (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const page = getPageById(id) as any;
    if (!page) {
      return res.status(404).json({ success: false, error: '頁面不存在' });
    }

    deletePage(id);

    // 記錄活動
    logActivity({
      id: 'log_' + uuid(),
      user_id: req.user!.id,
      action: 'page.delete',
      target_type: 'page',
      target_id: id,
      details: `刪除頁面: ${page.title}`,
      ip_address: req.ip || req.socket.remoteAddress || undefined
    });

    res.json({ success: true, message: '頁面已刪除' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
