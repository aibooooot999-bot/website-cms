import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '../../uploads/images');

// 取得所有圖片列表
router.get('/', (req, res) => {
  try {
    // 確保目錄存在
    if (!fs.existsSync(UPLOAD_DIR)) {
      return res.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(UPLOAD_DIR);
    
    const images = files
      .filter(file => {
        // 排除 .gitkeep
        if (file === '.gitkeep') return false;
        
        // 只保留圖片檔案
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(UPLOAD_DIR, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          url: `/uploads/images/${file}`,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString(),
        };
      })
      // 按上傳時間倒序排列
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    res.json({ success: true, data: images });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || '讀取媒體庫失敗' });
  }
});

// 刪除圖片
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // 安全檢查：防止路徑穿越
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: '無效的檔案名稱' });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    
    // 檢查檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '檔案不存在' });
    }

    // 刪除檔案
    fs.unlinkSync(filePath);
    
    res.json({ success: true, message: '檔案已刪除' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || '刪除失敗' });
  }
});

export default router;
