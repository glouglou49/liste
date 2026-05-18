import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import * as xlsx from 'xlsx';const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

// Dynamic Database instance
let db: Database.Database | null = null;
let currentDbPath: string | null = null;

function getDb(forceDbPath?: string): Database.Database {
  let dbPath = forceDbPath;
  
  if (!dbPath) {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.dbFilePath) dbPath = config.dbFilePath;
      }
    } catch (e) {}
  }

  if (!dbPath) {
    dbPath = path.join(app.getPath('userData'), 'catalog.db');
  }

  if (db && currentDbPath === dbPath) {
    return db;
  }

  if (db) {
    try { db.close(); } catch(e) {}
  }

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  currentDbPath = dbPath;

  db.exec(`
    CREATE TABLE IF NOT EXISTS manufacturers (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS references_data (
      ref TEXT PRIMARY KEY,
      designation TEXT,
      fabCode TEXT,
      weight REAL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS filiales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS charge_affaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filiale_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (filiale_id) REFERENCES filiales(id) ON DELETE CASCADE
    );
  `);

  // Initialize default password if not exists
  try {
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'adminPassword'");
    const row = stmt.get() as { value: string } | undefined;
    if (!row) {
      db.prepare("INSERT INTO settings (key, value) VALUES ('adminPassword', 'admin')").run();
    }
  } catch (err) {
    console.error('Error initializing settings table:', err);
  }

  return db;
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(_dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(_dirname, '../public/vite.svg'), // Temporaire
  });

  mainWindow.setMenu(null);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(_dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('get-manufacturers', async () => {
  try {
    return getDb().prepare('SELECT * FROM manufacturers ORDER BY name ASC').all();
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return [];
  }
});

ipcMain.handle('search-references', async (_event, query: string, fabCode?: string) => {
  try {
    let sql = 'SELECT * FROM references_data WHERE (ref LIKE ? OR designation LIKE ?)';
    const params: any[] = [`%${query}%`, `%${query}%`];
    
    if (fabCode) {
      sql += ' AND fabCode = ?';
      params.push(fabCode);
    }
    
    sql += ' LIMIT 50'; // Limit results for performance
    return getDb().prepare(sql).all(...params);
  } catch (error) {
    console.error('Error searching references:', error);
    return [];
  }
});

ipcMain.handle('get-reference', async (_event, ref: string) => {
  try {
    return getDb().prepare('SELECT * FROM references_data WHERE ref = ?').get(ref);
  } catch (error) {
    return null;
  }
});

ipcMain.handle('get-filiales', async () => {
  try {
    return getDb().prepare('SELECT * FROM filiales ORDER BY name ASC').all();
  } catch (error) {
    console.error('Error fetching filiales:', error);
    return [];
  }
});

ipcMain.handle('add-filiale', async (_event, data: { name: string }) => {
  try {
    const stmt = getDb().prepare('INSERT INTO filiales (name) VALUES (?)');
    const info = stmt.run(data.name);
    return { success: true, id: info.lastInsertRowid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-filiale', async (_event, id: number, data: { name: string }) => {
  try {
    getDb().prepare('UPDATE filiales SET name = ? WHERE id = ?').run(data.name, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-filiale', async (_event, id: number) => {
  try {
    getDb().prepare('DELETE FROM filiales WHERE id = ?').run(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-charge-affaires', async () => {
  try {
    return getDb().prepare('SELECT * FROM charge_affaires ORDER BY name ASC').all();
  } catch (error) {
    console.error('Error fetching charge_affaires:', error);
    return [];
  }
});

ipcMain.handle('add-charge-affaire', async (_event, data: { filiale_id: number; name: string }) => {
  try {
    const stmt = getDb().prepare('INSERT INTO charge_affaires (filiale_id, name) VALUES (?, ?)');
    const info = stmt.run(data.filiale_id, data.name);
    return { success: true, id: info.lastInsertRowid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-charge-affaire', async (_event, id: number) => {
  try {
    getDb().prepare('DELETE FROM charge_affaires WHERE id = ?').run(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-db-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  
  const dbPath = result.filePaths[0];
  getDb(dbPath); // Re-initialize DB if path changes
  return dbPath;
});

ipcMain.handle('open-project-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'Fichiers Liste', extensions: ['list'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data };
  } catch (error) {
    console.error(error);
    return { error: 'Impossible de lire le fichier' };
  }
});

ipcMain.handle('open-project-by-path', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { error: 'Le fichier n\'existe plus' };
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data };
  } catch (error) {
    console.error(error);
    return { error: 'Impossible de lire le fichier' };
  }
});

ipcMain.handle('save-new-project-file', async (_event, data: any, defaultFilename?: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultFilename,
    filters: [{ name: 'Fichiers Liste', extensions: ['list'] }]
  });
  if (result.canceled || !result.filePath) return null;
  try {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return result.filePath;
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('save-project-by-path', async (_event, filePath: string, data: any) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-excel-auto', async (_event, listFilePath: string, filename: string, base64Data: string) => {
  try {
    const dir = path.dirname(listFilePath);
    const destPath = path.join(dir, filename);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(destPath, buffer);
    return { success: true, filePath: destPath };
  } catch (error: any) {
    console.error('Error auto-exporting excel:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-pdf-auto', async (_event, listFilePath: string, filename: string, base64Data: string) => {
  try {
    const dir = path.dirname(listFilePath);
    const destPath = path.join(dir, filename);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(destPath, buffer);
    return { success: true, filePath: destPath };
  } catch (error: any) {
    console.error('Error auto-exporting pdf:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-config', async (_event, config: any) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  let existing = {};
  if (fs.existsSync(configPath)) {
    existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  const updated = { ...existing, ...config };
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));
  if (config.dbFilePath) getDb(config.dbFilePath);
});

ipcMain.handle('load-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return null;
});

ipcMain.handle('verify-admin-password', async (_event, password: string) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'adminPassword'").get() as { value: string } | undefined;
    const adminPassword = row ? row.value : 'admin';
    return password === adminPassword;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
});

ipcMain.handle('update-admin-password', async (_event, newPassword: string) => {
  try {
    const db = getDb();
    db.prepare("UPDATE settings SET value = ? WHERE key = 'adminPassword'").run(newPassword);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message };
  }
});

// --- Catalog Administration IPCs ---

ipcMain.handle('preview-excel-catalog', async (_event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xlsm', 'xls'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'Annulé' };

    const filePath = result.filePaths[0];
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (fsError: any) {
      if (fsError.code === 'EBUSY' || fsError.code === 'EPERM') {
        return { success: false, error: "Le fichier est ouvert dans un autre programme (ex: Excel). Veuillez le fermer avant de l'importer." };
      }
      return { success: false, error: "Impossible de lire le fichier: " + fsError.message };
    }

    const wb = xlsx.read(fileBuffer, { type: 'buffer' });
    const schema: Record<string, { id: string, label: string }[]> = {};

    const getColumnLetter = (index: number) => {
        let letter = '';
        let temp = index;
        while (temp >= 0) {
            letter = String.fromCharCode(65 + (temp % 26)) + letter;
            temp = Math.floor(temp / 26) - 1;
        }
        return letter;
    };

    wb.SheetNames.forEach(sheetName => {
      const sheet = wb.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      if (data && data.length > 0) {
        let headerRow = data[0] || [];
        let maxCols = 0;
        data.forEach(row => { if (row && row.length > maxCols) maxCols = row.length; });
        
        let cols = [];
        for (let i = 0; i < maxCols; i++) {
            let colLetter = getColumnLetter(i);
            let h = headerRow[i];
            
            let preview = [];
            for (let r = 1; r <= 2; r++) {
                if (data[r] && data[r][i] !== undefined && data[r][i] !== null && String(data[r][i]).trim() !== '') {
                    preview.push(String(data[r][i]).trim());
                }
            }
            let previewText = preview.length > 0 ? ` (Ex: ${preview.join(', ')})` : '';
            let label = `[${colLetter}] ${h ? String(h).trim() : 'Colonne ' + colLetter}${previewText}`;
            
            cols.push({ id: String(i), label });
        }
        schema[sheetName] = cols;
      } else {
        schema[sheetName] = [];
      }
    });

    return { success: true, filePath, schema };
  } catch (error: any) {
    console.error('Error previewing catalog:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-excel-catalog', async (_event, filePath: string, mapping: any) => {
  try {
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (fsError: any) {
      if (fsError.code === 'EBUSY' || fsError.code === 'EPERM') {
        return { success: false, error: "Le fichier est ouvert dans un autre programme (ex: Excel). Veuillez le fermer avant de l'importer." };
      }
      return { success: false, error: "Impossible de lire le fichier: " + fsError.message };
    }

    const wb = xlsx.read(fileBuffer, { type: 'buffer' });

    const transaction = getDb().transaction(() => {
      
      // 1. Import Manufacturers
      if (mapping.manufacturers && mapping.manufacturers.sheet) {
        const sheetName = mapping.manufacturers.sheet;
        if (wb.SheetNames.includes(sheetName)) {
           const sheet = wb.Sheets[sheetName];
           const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
           
           const validRows = [];
           for (let r = 1; r < data.length; r++) {
             const row = data[r];
             if (!row) continue;
             const code = row[parseInt(mapping.manufacturers.codeFab)];
             const name = row[parseInt(mapping.manufacturers.name)];
             if (code && name && String(code).trim() !== '' && String(code).trim() !== '-') {
               validRows.push({ code: String(code).trim(), name: String(name).trim() });
             }
           }
           
           if (validRows.length > 0) {
             getDb().prepare('DELETE FROM manufacturers').run();
             const insertFab = getDb().prepare('INSERT INTO manufacturers (code, name) VALUES (?, ?)');
             for (const item of validRows) {
               insertFab.run(item.code, item.name);
             }
           }
        }
      }

      // 2. Import References
      if (mapping.references && mapping.references.sheet) {
        const sheetName = mapping.references.sheet;
        if (wb.SheetNames.includes(sheetName)) {
           const sheet = wb.Sheets[sheetName];
           const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
           
           const validRows = [];
           for (let r = 1; r < data.length; r++) {
             const row = data[r];
             if (!row) continue;
             const ref = row[parseInt(mapping.references.ref)];
             const des = row[parseInt(mapping.references.designation)];
             const fab = row[parseInt(mapping.references.fabCode)];
             
             let weight = null;
             if (mapping.references.weight !== undefined && mapping.references.weight !== '') {
               const weightVal = row[parseInt(mapping.references.weight)];
               weight = weightVal ? parseFloat(String(weightVal).replace(',', '.')) : null;
             }

             if (ref && des && String(ref).trim() !== '-' && String(ref).trim() !== '') {
               validRows.push({
                 ref: String(ref).trim(),
                 des: String(des).trim(),
                 fab: String(fab).trim(),
                 weight: isNaN(weight as number) ? null : weight
               });
             }
           }
           
           if (validRows.length > 0) {
             getDb().prepare('DELETE FROM references_data').run();
             const insertRef = getDb().prepare('INSERT INTO references_data (ref, designation, fabCode, weight) VALUES (?, ?, ?, ?)');
             
             for (const item of validRows) {
               try {
                  insertRef.run(item.ref, item.des, item.fab, item.weight);
               } catch (err) {
                  console.warn('Duplicate or error inserting ref:', item.ref, err);
               }
             }
           }
        }
      }
    });

    transaction();
    return { success: true };
  } catch (error: any) {
    console.error('Error importing catalog:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-paginated-references', async (_event, page: number, pageSize: number, search: string) => {
  try {
    const offset = (page - 1) * pageSize;
    let sql = 'SELECT * FROM references_data';
    let countSql = 'SELECT COUNT(*) as total FROM references_data';
    const params: any[] = [];
    
    if (search && search.trim() !== '') {
      const query = `%${search.trim()}%`;
      const where = ' WHERE ref LIKE ? OR designation LIKE ? OR fabCode LIKE ?';
      sql += where;
      countSql += where;
      params.push(query, query, query);
    }
    
    sql += ' ORDER BY ref ASC LIMIT ? OFFSET ?';
    
    const countResult = getDb().prepare(countSql).get(...params) as { total: number };
    const items = getDb().prepare(sql).all(...params, pageSize, offset);
    
    return { items, total: countResult.total };
  } catch (error) {
    console.error('Error fetching paginated references:', error);
    return { items: [], total: 0 };
  }
});

// Basic CRUD for References
ipcMain.handle('add-reference', async (_event, data: any) => {
  try {
    const stmt = getDb().prepare('INSERT INTO references_data (ref, designation, fabCode, weight) VALUES (?, ?, ?, ?)');
    stmt.run(data.ref, data.designation, data.fabCode, data.weight || null);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-reference', async (_event, oldRef: string, data: any) => {
  try {
    const stmt = getDb().prepare('UPDATE references_data SET ref = ?, designation = ?, fabCode = ?, weight = ? WHERE ref = ?');
    stmt.run(data.ref, data.designation, data.fabCode, data.weight || null, oldRef);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-reference', async (_event, ref: string) => {
  try {
    getDb().prepare('DELETE FROM references_data WHERE ref = ?').run(ref);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Basic CRUD for Manufacturers
ipcMain.handle('add-manufacturer', async (_event, data: any) => {
  try {
    const stmt = getDb().prepare('INSERT INTO manufacturers (code, name) VALUES (?, ?)');
    stmt.run(data.code, data.name);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-manufacturer', async (_event, oldCode: string, data: any) => {
  try {
    const stmt = getDb().prepare('UPDATE manufacturers SET code = ?, name = ? WHERE code = ?');
    stmt.run(data.code, data.name, oldCode);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-manufacturer', async (_event, code: string) => {
  try {
    getDb().prepare('DELETE FROM manufacturers WHERE code = ?').run(code);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

