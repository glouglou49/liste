import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Save } from 'lucide-react';
import { Project } from '../types';
import { useStore } from '../store/useStore';

export interface ProjectSettingsModalProps {
  initialData?: Partial<Project>;
  isEditMode?: boolean;
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
}

export function ProjectSettingsModal({ initialData, isEditMode = false, onClose, onSave }: ProjectSettingsModalProps) {
  const filiales = useStore(state => state.filiales);
  const chargeAffaires = useStore(state => state.chargeAffaires);
  const defaultTechName = useStore(state => state.defaultTechName);
  const [formData, setFormData] = useState({
    techName: defaultTechName,
    filialeOrigine: '',
    affaireOrigine: '',
    ligneOrigine: '',
    filialeExecutant: '',
    affaireExecutant: '',
    ligneExecutant: '',
    affaireUF: '',
    ligneUF: '',
    client: '',
    nomAffaire: '',
    nomTableau: '',
    chargeAffaire: '',
    isSousTraitance: false,
    isUF: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'filialeOrigine') {
        const selectedFiliale = filiales.find(f => f.name === value);
        if (selectedFiliale) {
          const availableCAs = chargeAffaires.filter(ca => ca.filiale_id === selectedFiliale.id);
          if (!availableCAs.some(ca => ca.name === prev.chargeAffaire)) {
            next.chargeAffaire = '';
          }
        } else {
          next.chargeAffaire = '';
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.affaireOrigine || !formData.ligneOrigine || !formData.techName) return;
    
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {isEditMode ? <Save className="w-5 h-5 text-slate-500" /> : <Plus className="w-5 h-5 text-slate-500" />}
            {isEditMode ? "Paramètres de l'affaire" : "Nouvelle affaire"}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="project-settings-form" onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Row 1: Nom de l'affaire -- Client */}
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'affaire *</label>
                   <input 
                     required
                     type="text" 
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                     value={formData.nomAffaire}
                     onChange={e => handleChange('nomAffaire', e.target.value)}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                   <input 
                     required
                     type="text" 
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                     value={formData.client}
                     onChange={e => handleChange('client', e.target.value)}
                   />
                 </div>

                 {/* Row 2: Nom du tableau */}
                 <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Nom du tableau *</label>
                   <input 
                     required
                     type="text" 
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                     value={formData.nomTableau}
                     onChange={e => handleChange('nomTableau', e.target.value)}
                   />
                 </div>

                 {/* Row 3: Filiale d'origine */}
                 <div className="md:col-span-2 mt-2 pt-2 border-t border-slate-100">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Filiale d'origine *</label>
                   <select 
                     required
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                     value={formData.filialeOrigine}
                     onChange={e => handleChange('filialeOrigine', e.target.value)}
                   >
                     <option value="">-- Sélectionner une filiale --</option>
                     {filiales.map(f => (
                       <option key={f.id} value={f.name}>{f.name}</option>
                     ))}
                   </select>
                 </div>

                 {/* Row 4: N°affaire origine -- ligne origine */}
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">N° affaire origine *</label>
                   <input 
                     required
                     type="text" 
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                     value={formData.affaireOrigine}
                     onChange={e => handleChange('affaireOrigine', e.target.value)}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Ligne origine *</label>
                   <input 
                     required
                     type="text" 
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                     value={formData.ligneOrigine}
                     onChange={e => handleChange('ligneOrigine', e.target.value)}
                   />
                 </div>
                 
                 {/* Checkbox Sous-traitance */}
                 <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-200">
                   <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                     <input 
                       type="checkbox" 
                       checked={formData.isSousTraitance} 
                       onChange={e => handleChange('isSousTraitance', e.target.checked)} 
                       className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                     />
                     Sous-traitance
                   </label>
                 </div>

                 {/* Row 5: Filiale Exécutant */}
                 {formData.isSousTraitance && (
                   <>
                     <div className="md:col-span-2 mt-2 pt-2 border-t border-slate-100">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Filiale Exécutant (optionnel)</label>
                       <select 
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                         value={formData.filialeExecutant}
                         onChange={e => handleChange('filialeExecutant', e.target.value)}
                       >
                         <option value="">-- Sélectionner une filiale --</option>
                         {filiales.map(f => (
                           <option key={f.id} value={f.name}>{f.name}</option>
                         ))}
                       </select>
                     </div>

                     {/* Row 6: N°affaire Executant -- ligne Executant */}
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">N° affaire Exécutant (optionnel)</label>
                       <input 
                         type="text" 
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                         value={formData.affaireExecutant}
                         onChange={e => handleChange('affaireExecutant', e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Ligne Exécutant (optionnel)</label>
                       <input 
                         type="text" 
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                         value={formData.ligneExecutant}
                         onChange={e => handleChange('ligneExecutant', e.target.value)}
                       />
                     </div>
                   </>
                 )}
                 
                 {/* Checkbox UF */}
                 <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-200">
                   <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                     <input 
                       type="checkbox" 
                       checked={formData.isUF} 
                       onChange={e => handleChange('isUF', e.target.checked)} 
                       className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                     />
                     UF
                   </label>
                 </div>
                 
                 {/* Row 7: N°affaire UF -- ligne UF */}
                 {formData.isUF && (
                   <>
                     <div className="mt-2 pt-2 border-t border-slate-100">
                       <label className="block text-sm font-medium text-slate-700 mb-1">N° affaire UF (optionnel)</label>
                       <input 
                         type="text" 
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                         value={formData.affaireUF}
                         onChange={e => handleChange('affaireUF', e.target.value)}
                       />
                     </div>
                     <div className="mt-2 pt-2 border-t border-slate-100">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Ligne UF (optionnel)</label>
                       <input 
                         type="text" 
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                         value={formData.ligneUF}
                         onChange={e => handleChange('ligneUF', e.target.value)}
                       />
                     </div>
                   </>
                 )}
                 
                 {/* Row 8: Chargé d'affaire -- Technicien BE */}
                 <div className="mt-2 pt-2 border-t border-slate-100">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Chargé d'affaire *</label>
                   <select 
                     required
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm disabled:opacity-50"
                     value={formData.chargeAffaire}
                     onChange={e => handleChange('chargeAffaire', e.target.value)}
                     disabled={!formData.filialeOrigine}
                   >
                     <option value="">-- Sélectionner un chargé d'affaire --</option>
                     {(() => {
                       const selectedFiliale = filiales.find(f => f.name === formData.filialeOrigine);
                       if (!selectedFiliale) return null;
                       return chargeAffaires.filter(ca => ca.filiale_id === selectedFiliale.id).map(ca => (
                         <option key={ca.id} value={ca.name}>{ca.name}</option>
                       ));
                     })()}
                   </select>
                   {!formData.filialeOrigine && (
                     <p className="text-xs text-slate-500 mt-1">Veuillez d'abord sélectionner une filiale d'origine.</p>
                   )}
                 </div>
                 <div className="mt-2 pt-2 border-t border-slate-100">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Technicien BE *</label>
                   <input 
                     required
                     type="text" 
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
                     value={formData.techName}
                     onChange={e => handleChange('techName', e.target.value)}
                   />
                 </div>
             </div>
          </form>
        </div>
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-white transition-colors"
          >
            Annuler
          </button>
          <button 
            type="submit"
            form="project-settings-form"
            className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-md"
          >
            {isEditMode ? <Save className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
            {isEditMode ? "Enregistrer" : "Créer et choisir l'emplacement..."}
          </button>
        </div>
      </div>
    </div>
  );
}
