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

function getDb(forceRootPath?: string): Database.Database {
  let rootPath = forceRootPath || process.cwd();
  
  if (!forceRootPath) {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.rootPath) rootPath = config.rootPath;
      }
    } catch (e) {}
  }

  const dbPath = path.join(rootPath, 'catalog.db');

  if (db && currentDbPath === dbPath) {
    return db;
  }

  if (db) {
    try { db.close(); } catch(e) {}
  }

  db = new Database(dbPath);
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
  `);

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

let currentRootPath: string | null = null;

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

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  
  const rootPath = result.filePaths[0];
  const dbPath = path.join(rootPath, 'db');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
  currentRootPath = rootPath;
  getDb(rootPath); // Re-initialize DB if path changes
  return rootPath;
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

ipcMain.handle('save-new-project-file', async (_event, data: any) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
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

ipcMain.handle('save-config', async (_event, config: any) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
});

ipcMain.handle('load-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return null;
});

// --- Catalog Administration IPCs ---

ipcMain.handle('import-excel-catalog', async (_event) => {
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

    // Transaction for performance and safety
    const transaction = getDb().transaction(() => {
      // 1. Import Manufacturers
      if (wb.SheetNames.includes('Fabricant')) {
        const fabSheet = wb.Sheets['Fabricant'];
        const fabData: any[] = xlsx.utils.sheet_to_json(fabSheet);
        
        getDb().prepare('DELETE FROM manufacturers').run();
        const insertFab = getDb().prepare('INSERT INTO manufacturers (code, name) VALUES (?, ?)');
        
        for (const row of fabData) {
          const code = row['Code Fab'];
          const name = row['Fabricant'];
          if (code && name && String(code).trim() !== '' && String(code).trim() !== '-') {
            insertFab.run(String(code).trim(), String(name).trim());
          }
        }
      }

      // 2. Import References
      if (wb.SheetNames.includes('Référence')) {
        const refSheet = wb.Sheets['Référence'];
        // Use header: 1 to get array of arrays, as headers might be shifted or duplicated
        const refData: any[][] = xlsx.utils.sheet_to_json(refSheet, { header: 1 });
        
        getDb().prepare('DELETE FROM references_data').run();
        const insertRef = getDb().prepare('INSERT INTO references_data (ref, designation, fabCode, weight) VALUES (?, ?, ?, ?)');
        
        for (let i = 1; i < refData.length; i++) {
          const row = refData[i];
          if (!row || row.length < 4) continue;
          
          // Based on the observed structure:
          // index 1: Référence
          // index 2: Désignation
          // index 3: Code Fab
          // index 4: Poids (optional)
          const ref = row[1];
          const des = row[2];
          const fab = row[3];
          const weight = row[4] ? parseFloat(String(row[4]).replace(',', '.')) : null;

          if (ref && des && String(ref).trim() !== '-' && String(ref).trim() !== '') {
            try {
               insertRef.run(String(ref).trim(), String(des).trim(), String(fab).trim(), isNaN(weight as number) ? null : weight);
            } catch (err) {
               console.warn('Duplicate or error inserting ref:', ref, err);
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

