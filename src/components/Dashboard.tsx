import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Play, Plus, FolderOpen, ChevronRight, Download, Database, Clock, Edit2, Check, X, User } from 'lucide-react';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { Project } from '../types';

interface DashboardProps {
  onOpenAdmin?: () => void;
}

export function Dashboard({ onOpenAdmin }: DashboardProps) {
  const { openProjectFromFile, createProjectInteractive, recentFiles, openProjectByPath, defaultTechName, setDefaultTechName } = useStore();
  const isElectron = !!window.electronAPI;
  
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isEditingTech, setIsEditingTech] = useState(false);
  const [tempTechName, setTempTechName] = useState('');

  const handleOpenProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    await openProjectFromFile();
  };

  const handleCreateProject = async (data: Partial<Project>) => {
    const projectToCreate = { 
      ...data,
      id: `${data.affaireOrigine?.trim()}-${data.ligneOrigine?.trim()}`
    } as Omit<Project, 'createdAt'>;
    // Trim string values
    for (const key in projectToCreate) {
      if (typeof projectToCreate[key as keyof typeof projectToCreate] === 'string') {
        (projectToCreate as any)[key] = (projectToCreate as any)[key].trim();
      }
    }
    await createProjectInteractive(projectToCreate);
    setShowNewProjectModal(false);
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="p-4 sm:p-8 pt-12 sm:pt-20 max-w-4xl mx-auto flex flex-col gap-8">
      
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

         {/* Editable Tech Name */}
         <div className="mt-6 flex flex-col items-center justify-center">
            {isEditingTech ? (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm animate-in zoom-in-95">
                <User className="w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  className="w-48 outline-none text-sm font-medium text-slate-700 bg-transparent"
                  value={tempTechName}
                  onChange={e => setTempTechName(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setDefaultTechName(tempTechName.trim() || 'Technicien BE');
                      setIsEditingTech(false);
                    } else if (e.key === 'Escape') {
                      setIsEditingTech(false);
                    }
                  }}
                />
                <button onClick={() => { setDefaultTechName(tempTechName.trim() || 'Technicien BE'); setIsEditingTech(false); }} className="text-emerald-600 hover:text-emerald-700 p-1"><Check className="w-4 h-4" /></button>
                <button onClick={() => setIsEditingTech(false)} className="text-red-500 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium group">
                <User className="w-4 h-4 text-slate-400" />
                <span>{defaultTechName}</span>
                <button 
                  onClick={() => { setTempTechName(defaultTechName); setIsEditingTech(true); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                  title="Modifier votre nom"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
         </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Ouvrir une affaire */}
        <button 
          onClick={handleOpenProject}
          className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors group"
        >
           <div className="bg-blue-100 p-4 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform">
             <FolderOpen className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-bold text-slate-800 mb-2">Ouvrir une affaire</h2>
           <p className="text-sm text-slate-500">Parcourir les fichiers existants</p>
        </button>

        {/* Nouvelle affaire */}
        <button 
          onClick={() => setShowNewProjectModal(true)}
          className="bg-slate-50 hover:bg-slate-100 p-8 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center transition-colors group shadow-sm"
        >
           <div className="bg-slate-200 p-4 rounded-full text-slate-700 mb-4 group-hover:scale-110 transition-transform">
             <Plus className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-bold text-slate-800 mb-2">Nouvelle affaire</h2>
           <p className="text-sm text-slate-500">Créer une nouvelle nomenclature</p>
        </button>

      </div>
      
      {showNewProjectModal && (
        <ProjectSettingsModal 
          onClose={() => setShowNewProjectModal(false)}
          onSave={handleCreateProject}
        />
      )}

      {/* Affaires récentes */}
      {recentFiles.length > 0 && (
        <div className="mt-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Affaires récentes
          </h3>
          <div className="space-y-2">
            {recentFiles.map((file, idx) => (
              <button
                key={`${file.path}-${idx}`}
                onClick={() => openProjectByPath(file.path)}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {file.nomAffaire ? `${file.nomAffaire} — ${file.nomTableau}` : file.id}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {file.nomAffaire ? `N° ${file.id} • ` : ''}{file.tech} • {file.path}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium whitespace-nowrap ml-4">
                  {new Date(file.lastOpened).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
