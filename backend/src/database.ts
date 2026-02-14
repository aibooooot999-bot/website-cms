import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'cms.db');

let db: Database;

// 確保資料目錄存在
function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 儲存資料庫到檔案
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export async function initDatabase() {
  ensureDataDir();
  
  const SQL = await initSqlJs();
  
  // 嘗試載入現有資料庫
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('✅ 資料庫已載入');
  } else {
    db = new SQL.Database();
    console.log('✅ 建立新資料庫');
  }

  // 建立表格
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      permissions TEXT DEFAULT '[]',
      is_system INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      email TEXT,
      avatar TEXT,
      role_id TEXT,
      status TEXT DEFAULT 'active',
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT,
      excerpt TEXT,
      featured_image TEXT,
      status TEXT DEFAULT 'draft',
      template TEXT DEFAULT 'default',
      sort_order INTEGER DEFAULT 0,
      meta_title TEXT,
      meta_description TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 建立索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at)`);

  // 建立預設角色
  const roles = [
    {
      id: 'role_super_admin',
      name: 'super_admin',
      display_name: '超級管理員',
      description: '擁有所有權限',
      permissions: ['*'],
      is_system: 1
    },
    {
      id: 'role_admin',
      name: 'admin',
      display_name: '管理員',
      description: '可管理內容與使用者',
      permissions: ['pages.*', 'users.view', 'users.edit', 'roles.view', 'logs.view'],
      is_system: 1
    },
    {
      id: 'role_editor',
      name: 'editor',
      display_name: '編輯者',
      description: '可編輯與發布內容',
      permissions: ['pages.view', 'pages.create', 'pages.edit', 'pages.publish'],
      is_system: 1
    },
    {
      id: 'role_viewer',
      name: 'viewer',
      display_name: '檢視者',
      description: '只能檢視內容',
      permissions: ['pages.view'],
      is_system: 1
    }
  ];

  for (const role of roles) {
    const existing = db.exec(`SELECT id FROM roles WHERE id = '${role.id}'`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(`
        INSERT INTO roles (id, name, display_name, description, permissions, is_system)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [role.id, role.name, role.display_name, role.description, JSON.stringify(role.permissions), role.is_system]);
    }
  }

  // 建立預設管理員帳號
  const adminExists = db.exec(`SELECT id FROM users WHERE username = 'admin'`);
  if (adminExists.length === 0 || adminExists[0].values.length === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.run(`
      INSERT INTO users (id, username, password_hash, display_name, role_id, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['user_admin', 'admin', passwordHash, '系統管理員', 'role_super_admin', 'active']);
    console.log('✅ 建立預設管理員帳號 (admin / admin123)');
  }

  saveDb();
  console.log('✅ 資料庫初始化完成');
}

// Helper functions
function rowToObject(columns: string[], values: any[]): any {
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
}

function execToArray(result: any[]): any[] {
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row: any[]) => rowToObject(columns, row));
}

function execToOne(result: any[]): any | null {
  const arr = execToArray(result);
  return arr.length > 0 ? arr[0] : null;
}

// ===== Users =====
export function getUserByUsername(username: string) {
  const result = db.exec(`
    SELECT u.*, r.name as role_name, r.display_name as role_display_name, r.permissions as role_permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.username = '${username.replace(/'/g, "''")}'
  `);
  return execToOne(result);
}

export function getUserById(id: string) {
  const result = db.exec(`
    SELECT u.*, r.name as role_name, r.display_name as role_display_name, r.permissions as role_permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = '${id}'
  `);
  return execToOne(result);
}

export function getAllUsers() {
  const result = db.exec(`
    SELECT u.id, u.username, u.display_name, u.email, u.avatar, u.status, u.last_login, u.created_at,
           r.name as role_name, r.display_name as role_display_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `);
  return execToArray(result);
}

export function createUser(data: {
  id: string;
  username: string;
  password_hash: string;
  display_name?: string;
  email?: string;
  role_id: string;
}) {
  db.run(`
    INSERT INTO users (id, username, password_hash, display_name, email, role_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [data.id, data.username, data.password_hash, data.display_name || null, data.email || null, data.role_id]);
  saveDb();
}

export function updateUser(id: string, data: Partial<{
  display_name: string;
  email: string;
  avatar: string;
  role_id: string;
  status: string;
}>) {
  const sets: string[] = [];
  const values: any[] = [];
  
  if (data.display_name !== undefined) { sets.push('display_name = ?'); values.push(data.display_name); }
  if (data.email !== undefined) { sets.push('email = ?'); values.push(data.email); }
  if (data.avatar !== undefined) { sets.push('avatar = ?'); values.push(data.avatar); }
  if (data.role_id !== undefined) { sets.push('role_id = ?'); values.push(data.role_id); }
  if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
  
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    values.push(id);
    db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);
    saveDb();
  }
}

export function updateUserPassword(id: string, passwordHash: string) {
  db.run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [passwordHash, id]);
  saveDb();
}

export function updateUserLastLogin(id: string) {
  db.run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [id]);
  saveDb();
}

export function deleteUser(id: string) {
  db.run(`DELETE FROM users WHERE id = ?`, [id]);
  saveDb();
}

// ===== Roles =====
export function getAllRoles() {
  const result = db.exec(`SELECT * FROM roles ORDER BY is_system DESC, created_at ASC`);
  return execToArray(result);
}

export function getRoleById(id: string) {
  const result = db.exec(`SELECT * FROM roles WHERE id = '${id}'`);
  return execToOne(result);
}

export function createRole(data: {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
}) {
  db.run(`
    INSERT INTO roles (id, name, display_name, description, permissions)
    VALUES (?, ?, ?, ?, ?)
  `, [data.id, data.name, data.display_name, data.description || null, JSON.stringify(data.permissions)]);
  saveDb();
}

export function updateRole(id: string, data: Partial<{
  display_name: string;
  description: string;
  permissions: string[];
}>) {
  const sets: string[] = [];
  const values: any[] = [];
  
  if (data.display_name !== undefined) { sets.push('display_name = ?'); values.push(data.display_name); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  if (data.permissions !== undefined) { sets.push('permissions = ?'); values.push(JSON.stringify(data.permissions)); }
  
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    values.push(id);
    db.run(`UPDATE roles SET ${sets.join(', ')} WHERE id = ?`, values);
    saveDb();
  }
}

export function deleteRole(id: string) {
  db.run(`DELETE FROM roles WHERE id = ?`, [id]);
  saveDb();
}

// ===== Pages =====
export function getAllPages() {
  const result = db.exec(`
    SELECT p.*, u.display_name as created_by_name
    FROM pages p
    LEFT JOIN users u ON p.created_by = u.id
    ORDER BY p.sort_order ASC, p.created_at DESC
  `);
  return execToArray(result);
}

export function getPageById(id: string) {
  const result = db.exec(`SELECT * FROM pages WHERE id = '${id}'`);
  return execToOne(result);
}

export function getPageBySlug(slug: string) {
  const result = db.exec(`SELECT * FROM pages WHERE slug = '${slug.replace(/'/g, "''")}'`);
  return execToOne(result);
}

export function createPage(data: {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  status?: string;
  template?: string;
  meta_title?: string;
  meta_description?: string;
  created_by: string;
}) {
  db.run(`
    INSERT INTO pages (id, title, slug, content, excerpt, status, template, meta_title, meta_description, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.id, data.title, data.slug, data.content || null, data.excerpt || null,
    data.status || 'draft', data.template || 'default', data.meta_title || null,
    data.meta_description || null, data.created_by, data.created_by
  ]);
  saveDb();
}

export function updatePage(id: string, data: Partial<{
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  status: string;
  template: string;
  sort_order: number;
  meta_title: string;
  meta_description: string;
  updated_by: string;
}>) {
  const sets: string[] = [];
  const values: any[] = [];
  
  if (data.title !== undefined) { sets.push('title = ?'); values.push(data.title); }
  if (data.slug !== undefined) { sets.push('slug = ?'); values.push(data.slug); }
  if (data.content !== undefined) { sets.push('content = ?'); values.push(data.content); }
  if (data.excerpt !== undefined) { sets.push('excerpt = ?'); values.push(data.excerpt); }
  if (data.featured_image !== undefined) { sets.push('featured_image = ?'); values.push(data.featured_image); }
  if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
  if (data.template !== undefined) { sets.push('template = ?'); values.push(data.template); }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(data.sort_order); }
  if (data.meta_title !== undefined) { sets.push('meta_title = ?'); values.push(data.meta_title); }
  if (data.meta_description !== undefined) { sets.push('meta_description = ?'); values.push(data.meta_description); }
  if (data.updated_by !== undefined) { sets.push('updated_by = ?'); values.push(data.updated_by); }
  
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    values.push(id);
    db.run(`UPDATE pages SET ${sets.join(', ')} WHERE id = ?`, values);
    saveDb();
  }
}

export function deletePage(id: string) {
  db.run(`DELETE FROM pages WHERE id = ?`, [id]);
  saveDb();
}

// ===== Activity Logs =====
export function logActivity(data: {
  id: string;
  user_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  ip_address?: string;
}) {
  db.run(`
    INSERT INTO activity_logs (id, user_id, action, target_type, target_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [data.id, data.user_id, data.action, data.target_type || null, data.target_id || null, data.details || null, data.ip_address || null]);
  saveDb();
}

export function getActivityLogs(limit = 20, offset = 0) {
  const result = db.exec(`
    SELECT a.*, u.display_name as user_name
    FROM activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  return execToArray(result);
}

export function getActivityLogsCount() {
  const result = db.exec(`SELECT COUNT(*) as count FROM activity_logs`);
  return execToOne(result)?.count || 0;
}

// ===== Dashboard Stats =====
export function getDashboardStats() {
  const totalPages = execToOne(db.exec(`SELECT COUNT(*) as count FROM pages`))?.count || 0;
  const publishedPages = execToOne(db.exec(`SELECT COUNT(*) as count FROM pages WHERE status = 'published'`))?.count || 0;
  const totalUsers = execToOne(db.exec(`SELECT COUNT(*) as count FROM users`))?.count || 0;
  const recentActivities = execToOne(db.exec(`
    SELECT COUNT(*) as count FROM activity_logs 
    WHERE created_at >= datetime('now', '-7 days')
  `))?.count || 0;

  return { totalPages, publishedPages, totalUsers, recentActivities };
}

export function getDb() {
  return db;
}
