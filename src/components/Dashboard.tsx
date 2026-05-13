import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Play, Plus, FolderOpen, ChevronRight, Download, Database } from 'lucide-react';

interface DashboardProps {
  onOpenAdmin?: () => void;
}

export function Dashboard({ onOpenAdmin }: DashboardProps) {
  const { openProjectFromFile, createProjectInteractive, rootPath, setRootPath } = useStore();
  const isElectron = !!window.electronAPI;
  
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectTech, setNewProjectTech] = useState('');

  const handleOpenProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    await openProjectFromFile();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectId || !newProjectTech) return;
    await createProjectInteractive(newProjectId.trim(), newProjectTech.trim());
  };

  const handleSelectDirectory = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) setRootPath(path);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto h-full overflow-auto w-full flex flex-col gap-8 justify-center min-h-[calc(100vh-2rem)]">
      
      <div className="text-center mb-8 relative">
         <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Gestion d'Affaires</h1>
         <p className="text-slate-500 mt-2">Ouvrez ou créez une affaire pour gérer sa nomenclature.</p>
         
         {onOpenAdmin && isElectron && (
           <button 
             onClick={onOpenAdmin}
             className="absolute top-0 right-0 hidden sm:flex bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium items-center gap-2 shadow-sm transition-all"
           >
             <Database className="w-4 h-4" />
             Catalogue
           </button>
         )}
      </div>

      {onOpenAdmin && isElectron && (
        <button 
          onClick={onOpenAdmin}
          className="sm:hidden w-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all mb-4"
        >
          <Database className="w-5 h-5" />
          Administration du Catalogue
        </button>
      )}


      {isElectron && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between shadow-sm">
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-lg text-blue-800">Emplacement des données</h3>
            <p className="text-sm text-blue-600 mt-1">
              {rootPath ? `Dossier actif : ${rootPath}` : "Utilise le dossier par défaut de l'application."}
            </p>
          </div>
          <button 
            onClick={handleSelectDirectory}
            className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <FolderOpen className="w-5 h-5" />
            Choisir un dossier (Serveur)
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Ouvrir une affaire */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
           <div className="bg-blue-100 p-4 rounded-full text-blue-600 mb-6">
             <FolderOpen className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-bold text-slate-800 mb-2">Ouvrir une affaire</h2>
           <p className="text-sm text-slate-500 mb-8">Sélectionnez un fichier .list existant sur votre ordinateur ou le réseau.</p>
           
           <button 
             onClick={handleOpenProject}
             className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
           >
             <FolderOpen className="w-5 h-5" /> Parcourir les fichiers...
           </button>
        </div>

        {/* Nouvelle affaire */}
        <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
           <div className="flex items-center gap-3 mb-6">
             <div className="bg-slate-200 p-2.5 rounded-lg text-slate-700">
               <Plus className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-bold text-slate-800">Nouvelle affaire</h2>
           </div>

           <form onSubmit={handleCreateProject} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Numéro d'affaire</label>
               <input 
                 required
                 type="text" 
                 className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white"
                 value={newProjectId}
                 onChange={e => setNewProjectId(e.target.value)}
                 placeholder="ex: 407722-01"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Technicien BE</label>
               <input 
                 required
                 type="text" 
                 className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white"
                 value={newProjectTech}
                 onChange={e => setNewProjectTech(e.target.value)}
                 placeholder="ex: J. Dupont"
               />
             </div>
             
             <button 
               type="submit"
               className="w-full bg-slate-700 hover:bg-slate-800 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors mt-6 shadow-md"
             >
               <FolderOpen className="w-5 h-5" /> Créer et choisir l'emplacement...
             </button>
           </form>
        </div>

      </div>
    </div>
  );
}
