import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getManufacturers: () => ipcRenderer.invoke('get-manufacturers'),
  searchReferences: (query: string, fabCode?: string) => ipcRenderer.invoke('search-references', query, fabCode),
  getReference: (ref: string) => ipcRenderer.invoke('get-reference', ref),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openProjectFile: () => ipcRenderer.invoke('open-project-file'),
  saveNewProjectFile: (data: any) => ipcRenderer.invoke('save-new-project-file', data),
  saveProjectByPath: (filePath: string, data: any) => ipcRenderer.invoke('save-project-by-path', filePath, data),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  
  // Catalog Administration
  importExcelCatalog: () => ipcRenderer.invoke('import-excel-catalog'),
  getPaginatedReferences: (page: number, pageSize: number, search: string) => ipcRenderer.invoke('get-paginated-references', page, pageSize, search),
  addReference: (data: any) => ipcRenderer.invoke('add-reference', data),
  updateReference: (oldRef: string, data: any) => ipcRenderer.invoke('update-reference', oldRef, data),
  deleteReference: (ref: string) => ipcRenderer.invoke('delete-reference', ref),
  addManufacturer: (data: any) => ipcRenderer.invoke('add-manufacturer', data),
  updateManufacturer: (oldCode: string, data: any) => ipcRenderer.invoke('update-manufacturer', oldCode, data),
  deleteManufacturer: (code: string) => ipcRenderer.invoke('delete-manufacturer', code),
});
