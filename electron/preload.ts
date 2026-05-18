import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getManufacturers: () => ipcRenderer.invoke('get-manufacturers'),
  searchReferences: (query: string, fabCode?: string) => ipcRenderer.invoke('search-references', query, fabCode),
  getReference: (ref: string) => ipcRenderer.invoke('get-reference', ref),
  selectDbFile: () => ipcRenderer.invoke('select-db-file'),
  openProjectFile: () => ipcRenderer.invoke('open-project-file'),
  openProjectByPath: (filePath: string) => ipcRenderer.invoke('open-project-by-path', filePath),
  saveNewProjectFile: (data: any, defaultFilename?: string) => ipcRenderer.invoke('save-new-project-file', data, defaultFilename),
  saveProjectByPath: (filePath: string, data: any) => ipcRenderer.invoke('save-project-by-path', filePath, data),
  exportExcelAuto: (listFilePath: string, filename: string, base64Data: string) => ipcRenderer.invoke('export-excel-auto', listFilePath, filename, base64Data),
  exportPdfAuto: (listFilePath: string, filename: string, base64Data: string) => ipcRenderer.invoke('export-pdf-auto', listFilePath, filename, base64Data),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  verifyAdminPassword: (password: string) => ipcRenderer.invoke('verify-admin-password', password),
  updateAdminPassword: (newPassword: string) => ipcRenderer.invoke('update-admin-password', newPassword),
  
  // Catalog Administration
  previewExcelCatalog: () => ipcRenderer.invoke('preview-excel-catalog'),
  importExcelCatalog: (filePath: string, mapping: any) => ipcRenderer.invoke('import-excel-catalog', filePath, mapping),
  getPaginatedReferences: (page: number, pageSize: number, search: string) => ipcRenderer.invoke('get-paginated-references', page, pageSize, search),
  addReference: (data: any) => ipcRenderer.invoke('add-reference', data),
  updateReference: (oldRef: string, data: any) => ipcRenderer.invoke('update-reference', oldRef, data),
  deleteReference: (ref: string) => ipcRenderer.invoke('delete-reference', ref),
  addManufacturer: (data: any) => ipcRenderer.invoke('add-manufacturer', data),
  updateManufacturer: (oldCode: string, data: any) => ipcRenderer.invoke('update-manufacturer', oldCode, data),
  deleteManufacturer: (code: string) => ipcRenderer.invoke('delete-manufacturer', code),
  
  getFiliales: () => ipcRenderer.invoke('get-filiales'),
  addFiliale: (data: any) => ipcRenderer.invoke('add-filiale', data),
  updateFiliale: (id: number, data: any) => ipcRenderer.invoke('update-filiale', id, data),
  deleteFiliale: (id: number) => ipcRenderer.invoke('delete-filiale', id),

  getChargeAffaires: () => ipcRenderer.invoke('get-charge-affaires'),
  addChargeAffaire: (data: any) => ipcRenderer.invoke('add-charge-affaire', data),
  deleteChargeAffaire: (id: number) => ipcRenderer.invoke('delete-charge-affaire', id),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Auto-Update
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateAvailable: (callback: (event: any, info: any) => void) => ipcRenderer.on('update-available', callback),
  onDownloadProgress: (callback: (event: any, progressObj: any) => void) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback: (event: any, error: string) => void) => ipcRenderer.on('update-error', callback),
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
  }
});
