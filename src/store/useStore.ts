import { create } from 'zustand';
import { Project, BOMLine, Manufacturer, ComponentRef, Sublist, Category, Filiale, ChargeAffaire } from '../types';
import { mockManufacturers, mockReferences, mockProjects } from '../mockData';

export type RecentFile = { id: string, path: string, tech: string, nomAffaire?: string, nomTableau?: string, lastOpened: number };

interface AppState {
  bomLines: BOMLine[];
  manufacturers: Manufacturer[];
  filiales: Filiale[];
  chargeAffaires: ChargeAffaire[];
  currentProjectId: string | null;
  currentProject: Project | null;
  currentProjectPath: string | null;
  sublists: Sublist[];
  dbFilePath: string | null;
  recentFiles: RecentFile[];
  defaultTechName: string;
  
  isLoaded: boolean;
  loadState: () => Promise<void>;
  refreshCatalogs: () => Promise<void>;
  saveState: () => Promise<void>;
  setDbFilePath: (path: string) => Promise<void>;
  setDefaultTechName: (name: string) => Promise<void>;
  
  addSublist: (sublist: Omit<Sublist, 'id'>) => Promise<void>;
  removeSublist: (id: string) => Promise<void>;
  
  updateProjectSettings: (data: Partial<Project>) => Promise<void>;
  closeProject: () => void;
  openProjectFromFile: () => Promise<void>;
  openProjectByPath: (filePath: string) => Promise<void>;
  createProjectInteractive: (projectData: Omit<Project, 'createdAt'>) => Promise<boolean>;
  
  addOrUpdateBOMLine: (line: Omit<BOMLine, 'id'>) => Promise<void>;
  removeBOMLine: (id: string) => Promise<void>;
  updateBOMLineQte: (id: string, quantity: number) => Promise<void>;

  importBOMData: (projectId: string, data: any[]) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: {
      getManufacturers: () => Promise<Manufacturer[]>;
      searchReferences: (query: string, fabCode?: string) => Promise<ComponentRef[]>;
      getReference: (ref: string) => Promise<ComponentRef | null>;
      selectDbFile: () => Promise<string | null>;
      openProjectFile: () => Promise<{ filePath: string, data: any } | { error: string } | null>;
      openProjectByPath: (filePath: string) => Promise<{ filePath: string, data: any } | { error: string }>;
      saveNewProjectFile: (data: any, defaultFilename?: string) => Promise<string | { error: string } | null>;
      saveProjectByPath: (filePath: string, data: any) => Promise<{ success: boolean; error?: string }>;
      exportExcelAuto: (listFilePath: string, filename: string, base64Data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      exportPdfAuto: (listFilePath: string, filename: string, base64Data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      saveConfig: (config: any) => Promise<any>;
      loadConfig: () => Promise<any>;
      verifyAdminPassword: (password: string) => Promise<boolean>;
      updateAdminPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
      
      previewExcelCatalog: () => Promise<{ success: boolean; filePath?: string; schema?: Record<string, { id: string; label: string }[]>; error?: string }>;
      importExcelCatalog: (filePath: string, mapping: any) => Promise<{ success: boolean; error?: string }>;
      getPaginatedReferences: (page: number, pageSize: number, search: string) => Promise<{ items: ComponentRef[]; total: number }>;
      addReference: (data: Omit<ComponentRef, 'weight'> & { weight?: number }) => Promise<{ success: boolean; error?: string }>;
      updateReference: (oldRef: string, data: Omit<ComponentRef, 'weight'> & { weight?: number }) => Promise<{ success: boolean; error?: string }>;
      deleteReference: (ref: string) => Promise<{ success: boolean; error?: string }>;
      addManufacturer: (data: Manufacturer) => Promise<{ success: boolean; error?: string }>;
      updateManufacturer: (oldCode: string, data: Manufacturer) => Promise<{ success: boolean; error?: string }>;
      deleteManufacturer: (code: string) => Promise<{ success: boolean; error?: string }>;
      
      getFiliales: () => Promise<Filiale[]>;
      addFiliale: (data: { name: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
      updateFiliale: (id: number, data: { name: string }) => Promise<{ success: boolean; error?: string }>;
      deleteFiliale: (id: number) => Promise<{ success: boolean; error?: string }>;

      getChargeAffaires: () => Promise<ChargeAffaire[]>;
      addChargeAffaire: (data: { filiale_id: number; name: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteChargeAffaire: (id: number) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

const LOCAL_STORAGE_KEY = 'bom-app-data';

export const useStore = create<AppState>((set, get) => ({
  sublists: [],
  bomLines: [],
  manufacturers: [],
  filiales: [],
  chargeAffaires: [],
  currentProjectId: null,
  currentProject: null,
  currentProjectPath: null,
  dbFilePath: null,
  recentFiles: [],
  defaultTechName: 'Technicien BE',
  isLoaded: false,

  setDbFilePath: async (path) => {
    set({ dbFilePath: path });
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ dbFilePath: path });
    }
  },

  setDefaultTechName: async (name: string) => {
    set({ defaultTechName: name });
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ defaultTechName: name });
    }
  },

  saveState: async () => {
    const state = get();
    const { currentProjectId, currentProjectPath } = state;

    if (!currentProjectId) return;

    const projectData = {
      project: state.currentProject,
      sublists: state.sublists.filter(s => s.projectId === currentProjectId),
      bomLines: state.bomLines.filter(l => l.projectId === currentProjectId)
    };

    if (window.electronAPI && currentProjectPath) {
      await window.electronAPI.saveProjectByPath(currentProjectPath, projectData);
    } else if (!window.electronAPI) {
      const dataToSave = {
        manufacturers: state.manufacturers,
        sublists: state.sublists,
        bomLines: state.bomLines
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    }
  },

  loadState: async () => {
    try {
      let manufacturers = mockManufacturers || [];
      if (window.electronAPI) {
        const manufPromise = window.electronAPI.getManufacturers();
        const filialesPromise = window.electronAPI.getFiliales();
        const caPromise = window.electronAPI.getChargeAffaires();
        const config = await window.electronAPI.loadConfig();
        
        const [manufData, filialesData, caData] = await Promise.all([manufPromise, filialesPromise, caPromise]);
        
        set({
          manufacturers: manufData || [],
          filiales: filialesData || [],
          chargeAffaires: caData || [],
          recentFiles: config?.recentFiles || [],
          dbFilePath: config?.dbFilePath || null,
          defaultTechName: config?.defaultTechName || 'Technicien BE',
          isLoaded: true
        });
      } else {
        set({
          manufacturers: mockManufacturers,
          filiales: [],
          chargeAffaires: [],
          isLoaded: true
        });
      }
      
      if (!window.electronAPI) {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          set({
            sublists: data.sublists || [],
            bomLines: data.bomLines || []
          });
        }
      }
    } catch(e) {
      console.error("Failed to load state", e);
    }
  },

  refreshCatalogs: async () => {
    if (window.electronAPI) {
      try {
        const manufPromise = window.electronAPI.getManufacturers();
        const filialesPromise = window.electronAPI.getFiliales();
        const caPromise = window.electronAPI.getChargeAffaires();
        const [manufData, filialesData, caData] = await Promise.all([manufPromise, filialesPromise, caPromise]);
        set({
          manufacturers: manufData || [],
          filiales: filialesData || [],
          chargeAffaires: caData || []
        });
      } catch (e) {
        console.error("Failed to refresh catalogs", e);
      }
    }
  },

  updateProjectSettings: async (data: Partial<Project>) => {
    const current = get().currentProject;
    if (!current) return;
    
    // Si affaireOrigine ou ligneOrigine change, on met à jour l'ID global de l'affaire
    let newId = current.id;
    if (data.affaireOrigine !== undefined || data.ligneOrigine !== undefined) {
      const ao = data.affaireOrigine ?? current.affaireOrigine ?? '';
      const lo = data.ligneOrigine ?? current.ligneOrigine ?? '';
      if (ao && lo) {
        newId = `${ao.trim()}-${lo.trim()}`;
      }
    }
    
    if (data.isUF) {
      const existingSublists = get().sublists;
      const hasUfList = existingSublists.some(s => s.name === 'APPRO ANTICIPE UF' && s.type === 'appro_anticipe');
      if (!hasUfList) {
        const newSublist = { 
          id: Math.random().toString(36).substr(2,9), 
          projectId: newId, 
          name: 'APPRO ANTICIPE UF', 
          type: 'appro_anticipe' as const 
        };
        set({ sublists: [...existingSublists, newSublist] });
      }
    }
    
    const updated = { ...current, ...data, id: newId };
    set({ currentProject: updated, currentProjectId: newId });
    await get().saveState();
  },

  closeProject: () => {
    set({ currentProjectId: null, currentProject: null, currentProjectPath: null, sublists: [], bomLines: [] });
  },

  openProjectFromFile: async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openProjectFile();
    if (!result) return; // Canceled
    if ('error' in result) {
      alert("Erreur: " + result.error);
      return;
    }
    
    const { filePath, data } = result;
    if (data && data.project) {
      const recent: RecentFile = { id: data.project.id, tech: data.project.techName, nomAffaire: data.project.nomAffaire, nomTableau: data.project.nomTableau, path: filePath, lastOpened: Date.now() };
      const currentRecents = get().recentFiles.filter(r => r.path !== filePath);
      const newRecents = [recent, ...currentRecents].slice(0, 5);
      
      set({
        currentProjectId: data.project.id,
        currentProject: data.project,
        currentProjectPath: filePath,
        sublists: data.sublists || [],
        bomLines: data.bomLines || [],
        recentFiles: newRecents
      });
      await window.electronAPI.saveConfig({ recentFiles: newRecents });
    } else {
      alert("Fichier non valide.");
    }
  },

  openProjectByPath: async (filePath: string) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openProjectByPath(filePath);
    if ('error' in result) {
      alert("Erreur: " + result.error);
      // Remove from recent if it fails
      const newRecents = get().recentFiles.filter(r => r.path !== filePath);
      set({ recentFiles: newRecents });
      await window.electronAPI.saveConfig({ recentFiles: newRecents });
      return;
    }
    
    const { data } = result;
    if (data && data.project) {
      const recent: RecentFile = { id: data.project.id, tech: data.project.techName, nomAffaire: data.project.nomAffaire, nomTableau: data.project.nomTableau, path: filePath, lastOpened: Date.now() };
      const currentRecents = get().recentFiles.filter(r => r.path !== filePath);
      const newRecents = [recent, ...currentRecents].slice(0, 5);
      
      set({
        currentProjectId: data.project.id,
        currentProject: data.project,
        currentProjectPath: filePath,
        sublists: data.sublists || [],
        bomLines: data.bomLines || [],
        recentFiles: newRecents
      });
      await window.electronAPI.saveConfig({ recentFiles: newRecents });
    } else {
      alert("Fichier non valide.");
    }
  },

  createProjectInteractive: async (data) => {
    const newProject = { ...data, createdAt: new Date().toISOString() };
    const initialSublists: Sublist[] = [];
    if (data.isUF) {
      initialSublists.push({ id: Math.random().toString(36).substr(2,9), projectId: data.id, name: 'APPRO ANTICIPE UF', type: 'appro_anticipe' });
    }
    const projectData = {
      project: newProject,
      sublists: initialSublists,
      bomLines: []
    };
    
    if (window.electronAPI) {
      const parts = [
        data.affaireOrigine,
        data.ligneOrigine,
        data.nomTableau,
        data.nomAffaire,
        data.client ? `(${data.client})` : ''
      ].filter(Boolean).map(s => String(s).trim().toUpperCase());
      const defaultFilename = parts.join(' ') + '.list';

      const result = await window.electronAPI.saveNewProjectFile(projectData, defaultFilename);
      if (!result) return false; // Canceled
      if (typeof result === 'object' && 'error' in result) {
        alert("Erreur: " + result.error);
        return false;
      }
      
      const filePath = result as string;
      const recent: RecentFile = { id: data.id, tech: data.techName, nomAffaire: data.nomAffaire, nomTableau: data.nomTableau, path: filePath, lastOpened: Date.now() };
      const currentRecents = get().recentFiles.filter(r => r.path !== filePath);
      const newRecents = [recent, ...currentRecents].slice(0, 5);
      
      set({
        currentProjectId: data.id,
        currentProject: newProject,
        currentProjectPath: filePath,
        sublists: initialSublists,
        bomLines: [],
        recentFiles: newRecents
      });
      await window.electronAPI.saveConfig({ recentFiles: newRecents });
      return true;
    } else {
      set({
        currentProjectId: data.id,
        currentProject: newProject,
        currentProjectPath: null,
        sublists: initialSublists,
        bomLines: []
      });
      get().saveState();
      return true;
    }
  },

  addSublist: async (sublist) => {
    const id = Math.random().toString(36).substr(2,9);
    set(state => ({ sublists: [...state.sublists, { ...sublist, id }] }));
    await get().saveState();
  },

  removeSublist: async (id) => {
    set(state => ({ 
      sublists: state.sublists.filter(s => s.id !== id), 
      bomLines: state.bomLines.filter(l => l.sublistId !== id) 
    }));
    await get().saveState();
  },

  addOrUpdateBOMLine: async (newLine) => {
    const state = get();
    const existingLineIndex = state.bomLines.findIndex(
      (l) => l.projectId === newLine.projectId && 
             l.ref === newLine.ref && 
             l.sublistId === newLine.sublistId && 
             l.location === newLine.location
    );

    if (existingLineIndex >= 0) {
      const line = state.bomLines[existingLineIndex];
      const newQty = line.quantity + newLine.quantity;
      const updatedLines = [...state.bomLines];
      updatedLines[existingLineIndex].quantity = newQty;
      set({ bomLines: updatedLines });
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      set({ bomLines: [...state.bomLines, { ...newLine, id }] });
    }
    await get().saveState();
  },

  removeBOMLine: async (id) => {
    set((state) => ({ bomLines: state.bomLines.filter(l => l.id !== id) }));
    await get().saveState();
  },

  updateBOMLineQte: async (id, quantity) => {
    set((state) => ({
      bomLines: state.bomLines.map(l => l.id === id ? { ...l, quantity } : l)
    }));
    await get().saveState();
  },

  importBOMData: async (projectId, data) => {
      const state = get();
      let updatedLines = [...state.bomLines];

      data.forEach(item => {
          const ref = item['Référence'] || item['Reference'] || item['Ref'];
          if(!ref || ref === '-' || String(ref).trim() === '') return;
          
          let qty = parseFloat(item['Quantité'] || item['Qte'] || item['Qty'] || 1);
          if (isNaN(qty)) qty = 1;

          const category = item['Catégorie'] || item['Phase'] || 'Autre';
          const sublistId = item['_sublistId'] || ''; 
          const location = item['Localisation'] || item['Tableau'] || '';

          const existingLineIndex = updatedLines.findIndex(
            (l) => l.projectId === projectId && 
                   l.ref === ref && 
                   l.sublistId === sublistId && 
                   l.location === location
          );

          if (existingLineIndex >= 0) {
              updatedLines[existingLineIndex] = {
                  ...updatedLines[existingLineIndex],
                  quantity: updatedLines[existingLineIndex].quantity + qty
              };
          } else {
              const id = Math.random().toString(36).substr(2, 9);
              updatedLines.push({ id, projectId, ref, quantity: qty, category: category as Category, sublistId, location });
          }
      });

      set({ bomLines: updatedLines });
      await get().saveState();
  }
}));


