import { create } from 'zustand';
import { Project, BOMLine, Manufacturer, ComponentRef, Sublist, Category } from '../types';
import { mockManufacturers, mockReferences, mockProjects } from '../mockData';

interface AppState {
  bomLines: BOMLine[];
  manufacturers: Manufacturer[];
  currentProjectId: string | null;
  currentProject: Project | null;
  currentProjectPath: string | null;
  sublists: Sublist[];
  rootPath: string | null;
  
  isLoaded: boolean;
  loadState: () => Promise<void>;
  saveState: () => Promise<void>;
  setRootPath: (path: string) => Promise<void>;
  
  addSublist: (sublist: Omit<Sublist, 'id'>) => Promise<void>;
  removeSublist: (id: string) => Promise<void>;
  
  closeProject: () => void;
  openProjectFromFile: () => Promise<void>;
  createProjectInteractive: (id: string, techName: string) => Promise<boolean>;
  
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
      selectDirectory: () => Promise<string | null>;
      openProjectFile: () => Promise<{ filePath: string, data: any } | { error: string } | null>;
      saveNewProjectFile: (data: any) => Promise<string | { error: string } | null>;
      saveProjectByPath: (filePath: string, data: any) => Promise<{ success: boolean; error?: string }>;
      saveConfig: (config: any) => Promise<any>;
      loadConfig: () => Promise<any>;
      
      importExcelCatalog: () => Promise<{ success: boolean; error?: string }>;
      getPaginatedReferences: (page: number, pageSize: number, search: string) => Promise<{ items: ComponentRef[]; total: number }>;
      addReference: (data: Omit<ComponentRef, 'weight'> & { weight?: number }) => Promise<{ success: boolean; error?: string }>;
      updateReference: (oldRef: string, data: Omit<ComponentRef, 'weight'> & { weight?: number }) => Promise<{ success: boolean; error?: string }>;
      deleteReference: (ref: string) => Promise<{ success: boolean; error?: string }>;
      addManufacturer: (data: Manufacturer) => Promise<{ success: boolean; error?: string }>;
      updateManufacturer: (oldCode: string, data: Manufacturer) => Promise<{ success: boolean; error?: string }>;
      deleteManufacturer: (code: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

const LOCAL_STORAGE_KEY = 'bom-app-data';

export const useStore = create<AppState>((set, get) => ({
  sublists: [],
  bomLines: [],
  manufacturers: [],
  currentProjectId: null,
  currentProject: null,
  currentProjectPath: null,
  rootPath: null,
  isLoaded: false,

  setRootPath: async (path) => {
    set({ rootPath: path });
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ rootPath: path });
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
        const mfg = await window.electronAPI.getManufacturers();
        if (mfg) manufacturers = mfg;

        const config = await window.electronAPI.loadConfig();
        if (config?.rootPath) {
          set({ rootPath: config.rootPath });
        }
      }

      set({
        manufacturers: manufacturers,
        isLoaded: true
      });

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
      set({
        currentProjectId: data.project.id,
        currentProject: data.project,
        currentProjectPath: filePath,
        sublists: data.sublists || [],
        bomLines: data.bomLines || []
      });
    } else {
      alert("Fichier non valide.");
    }
  },

  createProjectInteractive: async (id, techName) => {
    const newProject = { id, techName, createdAt: new Date().toISOString() };
    const projectData = {
      project: newProject,
      sublists: [],
      bomLines: []
    };
    
    if (window.electronAPI) {
      const result = await window.electronAPI.saveNewProjectFile(projectData);
      if (!result) return false; // Canceled
      if (typeof result === 'object' && 'error' in result) {
        alert("Erreur: " + result.error);
        return false;
      }
      
      set({
        currentProjectId: id,
        currentProject: newProject,
        currentProjectPath: result,
        sublists: [],
        bomLines: []
      });
      return true;
    } else {
      set({
        currentProjectId: id,
        currentProject: newProject,
        currentProjectPath: null,
        sublists: [],
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


