import React, { useState, useEffect } from 'react';
import { Search, Database, Plus, Edit2, Trash2, ArrowLeft, UploadCloud, ChevronLeft, ChevronRight, ChevronDown, FolderOpen, X, Info, Key, Lock, Unlock } from 'lucide-react';
import { ComponentRef, Manufacturer, Filiale } from '../types';
import { useStore } from '../store/useStore';

interface CatalogAdminProps {
  onBack: () => void;
}

export const CatalogAdmin: React.FC<CatalogAdminProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'references' | 'manufacturers' | 'filiales'>('references');

  const { dbFilePath, setDbFilePath, refreshCatalogs, chargeAffaires } = useStore();
  const isElectron = !!window.electronAPI;

  // References State
  const [refs, setRefs] = useState<ComponentRef[]>([]);
  const [refSearch, setRefSearch] = useState('');
  const [refPage, setRefPage] = useState(1);
  const [refTotal, setRefTotal] = useState(0);
  const refPageSize = 50;

  // Manufacturers State
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufSearch, setManufSearch] = useState('');

  // Filiales State
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [filialeSearch, setFilialeSearch] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [importSchema, setImportSchema] = useState<Record<string, { id: string; label: string }[]> | null>(null);
  const [importFilePath, setImportFilePath] = useState<string | null>(null);
  const [mapping, setMapping] = useState({
    manufacturers: { sheet: '', codeFab: '', name: '' },
    references: { sheet: '', ref: '', designation: '', fabCode: '', weight: '' }
  });

  // Modal Item State
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemMode, setItemMode] = useState<'add' | 'edit'>('add');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [newCA, setNewCA] = useState('');

  // UI State
  const [expandedFiliales, setExpandedFiliales] = useState<number[]>([]);

  // Non-blocking UI State
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'ref' | 'manuf' | 'filiale', id: string | number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Security State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const requireUnlock = (action: () => void) => {
    if (isUnlocked) {
      action();
    } else {
      setPendingAction(() => action);
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!window.electronAPI) return;
    const isValid = await window.electronAPI.verifyAdminPassword(passwordInput);
    if (isValid) {
      setIsUnlocked(true);
      setShowPasswordModal(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      setPasswordError(true);
    }
  };

  useEffect(() => {
    if (activeTab === 'references') {
      fetchReferences();
    } else if (activeTab === 'manufacturers') {
      fetchManufacturers();
    } else {
      fetchFiliales();
    }
  }, [activeTab, refPage, refSearch, manufSearch, filialeSearch]);

  const fetchReferences = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getPaginatedReferences(refPage, refPageSize, refSearch);
      setRefs(data.items);
      setRefTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchManufacturers = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getManufacturers();
      setManufacturers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiliales = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getFiliales();
      setFiliales(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewExcel = async () => {
    if (!window.electronAPI) return;
    setImporting(true);
    try {
      const res = await window.electronAPI.previewExcelCatalog();
      if (res.success && res.schema && res.filePath) {
        setImportSchema(res.schema);
        setImportFilePath(res.filePath);
        
        const sheets = Object.keys(res.schema);
        if (sheets.length > 0) {
           setMapping({
             manufacturers: { sheet: sheets[0], codeFab: '', name: '' },
             references: { sheet: sheets[0], ref: '', designation: '', fabCode: '', weight: '' }
           });
        }
        setShowImportModal(true);
      } else if (res.error && res.error !== 'Annulé') {
        setErrorMsg("Erreur: " + res.error);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Erreur inattendue.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportExcel = async () => {
    if (!window.electronAPI || !importFilePath) return;
    setImporting(true);
    try {
      const res = await window.electronAPI.importExcelCatalog(importFilePath, mapping);
      if (res.success) {
        setShowImportModal(false);
        if (activeTab === 'references') fetchReferences();
        else fetchManufacturers();
      } else {
        setErrorMsg("Erreur lors de l'importation : " + res.error);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Erreur inattendue.');
    } finally {
      setImporting(false);
    }
  };

  const handleSelectDbFile = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDbFile();
      if (path) setDbFilePath(path);
    }
  };

  const handleDeleteRef = (ref: string) => {
    setDeleteConfirm({ type: 'ref', id: ref });
  };

  const executeDeleteRef = async (ref: string) => {
    const res = await window.electronAPI?.deleteReference(ref);
    if (res?.success) fetchReferences();
    else setErrorMsg('Erreur : ' + res?.error);
  };

  const handleDeleteManuf = (code: string) => {
    setDeleteConfirm({ type: 'manuf', id: code });
  };

  const executeDeleteManuf = async (code: string) => {
    const res = await window.electronAPI?.deleteManufacturer(code);
    if (res?.success) {
      fetchManufacturers();
      refreshCatalogs();
    } else setErrorMsg('Erreur : ' + res?.error);
  };

  const handleDeleteFiliale = (id: number) => {
    setDeleteConfirm({ type: 'filiale', id });
  };

  const executeDeleteFiliale = async (id: number) => {
    const res = await window.electronAPI?.deleteFiliale(id);
    if (res?.success) {
      fetchFiliales();
      refreshCatalogs();
    } else setErrorMsg('Erreur : ' + res?.error);
  };

  const handleOpenItemModal = (mode: 'add' | 'edit', item?: any) => {
    setItemMode(mode);
    setEditingItem(item || null);
    setNewCA('');
    if (activeTab === 'references') {
      setFormData(item ? { ...item } : { ref: '', designation: '', fabCode: '', weight: '' });
    } else if (activeTab === 'manufacturers') {
      setFormData(item ? { ...item } : { code: '', name: '' });
    } else {
      setFormData(item ? { ...item } : { name: '' });
    }
    setShowItemModal(true);
  };

  const handleAddCA = async () => {
    if (!window.electronAPI || !editingItem?.id || !newCA.trim()) return;
    const res = await window.electronAPI.addChargeAffaire({ filiale_id: editingItem.id, name: newCA.trim() });
    if (res.success) {
      setNewCA('');
      refreshCatalogs();
    } else {
      setErrorMsg('Erreur : ' + res.error);
    }
  };

  const handleDeleteCA = async (id: number) => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.deleteChargeAffaire(id);
    if (res.success) {
      refreshCatalogs();
    } else {
      setErrorMsg('Erreur : ' + res.error);
    }
  };

  const handleSaveItem = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      if (activeTab === 'references') {
        const data = { ...formData, weight: parseFloat(formData.weight) || undefined };
        let res;
        if (itemMode === 'add') res = await window.electronAPI.addReference(data);
        else res = await window.electronAPI.updateReference(editingItem.ref, data);
        
        if (res.success) {
          setShowItemModal(false);
          fetchReferences();
        } else setErrorMsg("Erreur: " + res.error);
      } else if (activeTab === 'manufacturers') {
        let res;
        if (itemMode === 'add') res = await window.electronAPI.addManufacturer(formData);
        else res = await window.electronAPI.updateManufacturer(editingItem.code, formData);
        
        if (res.success) {
          setShowItemModal(false);
          fetchManufacturers();
          refreshCatalogs();
        } else setErrorMsg("Erreur: " + res.error);
      } else {
        let res;
        if (itemMode === 'add') res = await window.electronAPI.addFiliale(formData);
        else res = await window.electronAPI.updateFiliale(editingItem.id, formData);
        
        if (res.success) {
          setShowItemModal(false);
          fetchFiliales();
          refreshCatalogs();
        } else setErrorMsg("Erreur: " + res.error);
      }
    } catch(e) {
      console.error(e);
      setErrorMsg("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(refTotal / refPageSize);

  const filteredManufacturers = manufacturers.filter(m =>
    m.name.toLowerCase().includes(manufSearch.toLowerCase()) ||
    m.code.toLowerCase().includes(manufSearch.toLowerCase())
  );

  const filteredFiliales = filiales.filter(f =>
    f.name.toLowerCase().includes(filialeSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Error Toast */}
      {errorMsg && (
        <div className="absolute top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md z-50 flex justify-between items-start max-w-md animate-in slide-in-from-top-2">
          <p className="text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="ml-4 text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center">
              <Database className="w-5 h-5 mr-2 text-blue-600" />
              Administration du Catalogue
            </h1>
            <p className="text-sm text-slate-500">Gérez vos références et fabricants</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => isUnlocked ? setIsUnlocked(false) : requireUnlock(() => {})}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
              isUnlocked 
                ? 'bg-slate-800 text-white hover:bg-slate-900 border border-transparent' 
                : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {isUnlocked ? 'Quitter le mode admin' : 'Passer en mode admin'}
          </button>

          {isUnlocked && (
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 rounded-lg shadow-sm transition-colors"
            >
              <Key className="w-4 h-4" />
              Modifier mot de passe admin
            </button>
          )}

          {isElectron && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
              <div className="text-right">
                <p className="text-xs font-semibold text-blue-800">Fichier de base de données</p>
                <p className="text-xs text-blue-600 max-w-[200px] truncate" title={dbFilePath || "Dossier par défaut"}>
                  {dbFilePath ? dbFilePath.split(/[/\\]/).pop() : "catalog.db (Par défaut)"}
                </p>
              </div>
              <button
                onClick={handleSelectDbFile}
                className="p-1.5 bg-white text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-md border border-blue-200 transition-colors"
                title="Choisir un fichier (.db)"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          )}
          {isUnlocked && (
            <button
              onClick={() => requireUnlock(handlePreviewExcel)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm transition-colors"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Importer
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => setActiveTab('references')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'references'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Références
          </button>
          <button
            onClick={() => setActiveTab('manufacturers')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'manufacturers'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Fabricants
          </button>
          <button
            onClick={() => setActiveTab('filiales')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'filiales'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Filiales
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white flex-1 rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="relative w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Rechercher ${activeTab === 'references' ? 'une référence...' : activeTab === 'manufacturers' ? 'un fabricant...' : 'une filiale...'}`}
                value={activeTab === 'references' ? refSearch : activeTab === 'manufacturers' ? manufSearch : filialeSearch}
                onChange={(e) => {
                  if (activeTab === 'references') {
                    setRefSearch(e.target.value);
                    setRefPage(1);
                  } else if (activeTab === 'manufacturers') {
                    setManufSearch(e.target.value);
                  } else {
                    setFilialeSearch(e.target.value);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
              />
            </div>
            {/* Add Button */}
            {isUnlocked && (
              <button 
                onClick={() => requireUnlock(() => handleOpenItemModal('add'))}
                className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                Chargement...
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm z-10">
                  {activeTab === 'references' ? (
                    <tr>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Référence</th>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Désignation</th>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code Fab.</th>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Poids</th>
                      {isUnlocked && <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                    </tr>
                  ) : activeTab === 'manufacturers' ? (
                    <tr>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code Fabricant</th>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom du Fabricant</th>
                      {isUnlocked && <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom de la Filiale</th>
                      {isUnlocked && <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTab === 'references' ? (
                    refs.length > 0 ? (
                      refs.map(r => (
                        <tr key={r.ref} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-3 px-6 font-mono text-sm text-slate-800">{r.ref}</td>
                          <td className="py-3 px-6 text-sm text-slate-600">{r.designation}</td>
                          <td className="py-3 px-6 text-sm text-slate-500">{r.fabCode}</td>
                          <td className="py-3 px-6 text-sm text-slate-500">{r.weight ? `${r.weight} kg` : '-'}</td>
                          {isUnlocked && (
                            <td className="py-3 px-6 text-right">
                              <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => requireUnlock(() => handleOpenItemModal('edit', r))} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => requireUnlock(() => handleDeleteRef(r.ref))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={isUnlocked ? 5 : 4} className="py-8 text-center text-slate-500">Aucune référence trouvée.</td></tr>
                    )
                  ) : activeTab === 'manufacturers' ? (
                    filteredManufacturers.length > 0 ? (
                      filteredManufacturers.map(m => (
                        <tr key={m.code} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-3 px-6 font-mono text-sm text-slate-800">{m.code}</td>
                          <td className="py-3 px-6 text-sm text-slate-600 font-medium">{m.name}</td>
                          {isUnlocked && (
                            <td className="py-3 px-6 text-right">
                              <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => requireUnlock(() => handleOpenItemModal('edit', m))} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => requireUnlock(() => handleDeleteManuf(m.code))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={isUnlocked ? 3 : 2} className="py-8 text-center text-slate-500">Aucun fabricant trouvé.</td></tr>
                    )
                  ) : (
                    filteredFiliales.length > 0 ? (
                      filteredFiliales.map(f => (
                        <React.Fragment key={f.id}>
                          <tr className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => f.id && setExpandedFiliales(prev => prev.includes(f.id!) ? prev.filter(p => p !== f.id) : [...prev, f.id!])}>
                            <td className="py-3 px-6 text-sm text-slate-600 font-medium flex items-center gap-2">
                              {f.id && expandedFiliales.includes(f.id) ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                              <FolderOpen className="w-4 h-4 text-blue-400" />
                              {f.name}
                            </td>
                            {isUnlocked && (
                              <td className="py-3 px-6 text-right">
                                <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); requireUnlock(() => handleOpenItemModal('edit', f)); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Gérer la filiale et ses CAs"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); requireUnlock(() => handleDeleteFiliale(f.id!)); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Supprimer la filiale"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                          {f.id && expandedFiliales.includes(f.id) && (
                            <tr>
                              <td colSpan={isUnlocked ? 2 : 1} className="p-0 border-b-0">
                                <div className="bg-slate-50/50 pl-14 pr-6 py-2 border-b border-slate-100 shadow-inner">
                                  {chargeAffaires.filter(ca => ca.filiale_id === f.id).length > 0 ? (
                                    <div className="space-y-1">
                                      {chargeAffaires.filter(ca => ca.filiale_id === f.id).map(ca => (
                                        <div key={ca.id} className="flex items-center gap-2 text-sm text-slate-600 py-1 hover:bg-slate-100 px-2 rounded group/ca">
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                          <span className="flex-1">{ca.name}</span>
                                          {isUnlocked && (
                                            <button 
                                              onClick={() => requireUnlock(() => handleDeleteCA(ca.id!))}
                                              className="text-red-400 hover:text-red-600 p-1 rounded opacity-0 group-hover/ca:opacity-100 transition-opacity"
                                              title="Supprimer ce CA"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-slate-400 italic py-1 px-2">Aucun chargé d'affaire. {isUnlocked && "Cliquez sur l'icône édition pour en ajouter."}</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr><td colSpan={isUnlocked ? 2 : 1} className="py-8 text-center text-slate-500">Aucune filiale trouvée.</td></tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer (Only for references) */}
          {activeTab === 'references' && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
              <div>
                Affichage de <span className="font-semibold text-slate-900">{(refPage - 1) * refPageSize + 1}</span> à <span className="font-semibold text-slate-900">{Math.min(refPage * refPageSize, refTotal)}</span> sur <span className="font-semibold text-slate-900">{refTotal}</span> références
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setRefPage(p => Math.max(1, p - 1))}
                  disabled={refPage === 1}
                  className="p-1.5 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-800">
                  {refPage} / {totalPages || 1}
                </span>
                <button
                  onClick={() => setRefPage(p => Math.min(totalPages, p + 1))}
                  disabled={refPage >= totalPages}
                  className="p-1.5 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <UploadCloud className="w-5 h-5 mr-2 text-emerald-600" />
                Importer un catalogue Excel
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-auto bg-slate-50">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 text-sm border border-blue-100">
                <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
                <p>Sélectionnez les feuilles de votre fichier Excel et associez vos colonnes aux champs requis par l'application.</p>
              </div>

              {importSchema && (
                <div className="space-y-8">
                  {/* Fabricants Mapping */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 text-lg">1. Fabricants</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Feuille Excel</label>
                        <select
                          className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-slate-50 py-2 px-3 border"
                          value={mapping.manufacturers.sheet}
                          onChange={e => setMapping(m => ({ ...m, manufacturers: { ...m.manufacturers, sheet: e.target.value } }))}
                        >
                          <option value="">-- Ignorer l'importation des fabricants --</option>
                          {Object.keys(importSchema).map(sheet => <option key={sheet} value={sheet}>{sheet}</option>)}
                        </select>
                      </div>

                      {mapping.manufacturers.sheet && importSchema[mapping.manufacturers.sheet] && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Code Fab <span className="text-red-500">*</span></label>
                            <select
                              className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                              value={mapping.manufacturers.codeFab}
                              onChange={e => setMapping(m => ({ ...m, manufacturers: { ...m.manufacturers, codeFab: e.target.value } }))}
                            >
                              <option value="">-- Sélectionner une colonne --</option>
                              {importSchema[mapping.manufacturers.sheet].map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom du Fabricant <span className="text-red-500">*</span></label>
                            <select
                              className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                              value={mapping.manufacturers.name}
                              onChange={e => setMapping(m => ({ ...m, manufacturers: { ...m.manufacturers, name: e.target.value } }))}
                            >
                              <option value="">-- Sélectionner une colonne --</option>
                              {importSchema[mapping.manufacturers.sheet].map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* References Mapping */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 text-lg">2. Références</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Feuille Excel</label>
                        <select
                          className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-slate-50 py-2 px-3 border"
                          value={mapping.references.sheet}
                          onChange={e => setMapping(m => ({ ...m, references: { ...m.references, sheet: e.target.value } }))}
                        >
                          <option value="">-- Ignorer l'importation des références --</option>
                          {Object.keys(importSchema).map(sheet => <option key={sheet} value={sheet}>{sheet}</option>)}
                        </select>
                      </div>

                      {mapping.references.sheet && importSchema[mapping.references.sheet] && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Référence <span className="text-red-500">*</span></label>
                            <select
                              className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                              value={mapping.references.ref}
                              onChange={e => setMapping(m => ({ ...m, references: { ...m.references, ref: e.target.value } }))}
                            >
                              <option value="">-- Sélectionner une colonne --</option>
                              {importSchema[mapping.references.sheet].map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Désignation <span className="text-red-500">*</span></label>
                            <select
                              className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                              value={mapping.references.designation}
                              onChange={e => setMapping(m => ({ ...m, references: { ...m.references, designation: e.target.value } }))}
                            >
                              <option value="">-- Sélectionner une colonne --</option>
                              {importSchema[mapping.references.sheet].map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Code Fab <span className="text-red-500">*</span></label>
                            <select
                              className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                              value={mapping.references.fabCode}
                              onChange={e => setMapping(m => ({ ...m, references: { ...m.references, fabCode: e.target.value } }))}
                            >
                              <option value="">-- Sélectionner une colonne --</option>
                              {importSchema[mapping.references.sheet].map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Poids <span className="text-slate-400 font-normal">(Optionnel)</span></label>
                            <select
                              className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                              value={mapping.references.weight}
                              onChange={e => setMapping(m => ({ ...m, references: { ...m.references, weight: e.target.value } }))}
                            >
                              <option value="">-- Ignorer --</option>
                              {importSchema[mapping.references.sheet].map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleImportExcel}
                disabled={importing || 
                  (mapping.manufacturers.sheet && (!mapping.manufacturers.codeFab || !mapping.manufacturers.name)) ||
                  (mapping.references.sheet && (!mapping.references.ref || !mapping.references.designation || !mapping.references.fabCode)) ||
                  (!mapping.manufacturers.sheet && !mapping.references.sheet)
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center shadow-md transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
              >
                {importing ? (
                  <span className="animate-pulse">Importation...</span>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Valider l'importation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal (Add/Edit Ref or Manuf) */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {itemMode === 'add' ? 'Ajouter' : 'Modifier'} {activeTab === 'references' ? 'une référence' : activeTab === 'manufacturers' ? 'un fabricant' : 'une filiale'}
              </h2>
              <button 
                onClick={() => setShowItemModal(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {activeTab === 'references' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Référence <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" 
                      value={formData.ref || ''} onChange={e => setFormData({...formData, ref: e.target.value})} disabled={itemMode === 'edit'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Désignation <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" 
                      value={formData.designation || ''} onChange={e => setFormData({...formData, designation: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Code Fab <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" 
                      value={formData.fabCode || ''} onChange={e => setFormData({...formData, fabCode: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Poids</label>
                    <input type="number" step="any" className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" 
                      value={formData.weight || ''} onChange={e => setFormData({...formData, weight: e.target.value})} />
                  </div>
                </>
              ) : activeTab === 'manufacturers' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Code Fabricant <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" 
                      value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} disabled={itemMode === 'edit'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom du Fabricant <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" 
                      value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la Filiale <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" 
                      value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>

                  {itemMode === 'edit' && editingItem && (
                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Chargés d'affaire associés</label>
                      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
                        {chargeAffaires.filter(ca => ca.filiale_id === editingItem.id).map(ca => (
                          <div key={ca.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm">
                            <span className="text-slate-700 font-medium">{ca.name}</span>
                            <button type="button" onClick={() => handleDeleteCA(ca.id!)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Supprimer ce CA"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                        {chargeAffaires.filter(ca => ca.filiale_id === editingItem.id).length === 0 && (
                          <div className="text-sm text-slate-500 italic text-center py-2">Aucun chargé d'affaire associé.</div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input type="text" className="flex-1 border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-3 border text-sm" placeholder="Nouveau CA..." value={newCA} onChange={e => setNewCA(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCA(); } }} />
                        <button type="button" onClick={handleAddCA} disabled={!newCA.trim()} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-md disabled:opacity-50 transition-colors flex items-center text-sm font-medium">
                          <Plus className="w-4 h-4 mr-1" /> Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveItem}
                disabled={loading || (activeTab === 'references' ? (!formData.ref || !formData.designation || !formData.fabCode) : activeTab === 'manufacturers' ? (!formData.code || !formData.name) : !formData.name)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmer la suppression</h3>
            <p className="text-slate-600 mb-6">Êtes-vous sûr de vouloir supprimer {deleteConfirm.type === 'ref' ? `la référence ${deleteConfirm.id}` : deleteConfirm.type === 'manuf' ? `le fabricant ${deleteConfirm.id}` : `cette filiale`} ?</p>
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'ref') executeDeleteRef(deleteConfirm.id as string);
                  else if (deleteConfirm.type === 'manuf') executeDeleteManuf(deleteConfirm.id as string);
                  else executeDeleteFiliale(deleteConfirm.id as number);
                  setDeleteConfirm(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Authentification requise</h3>
            <p className="text-sm text-slate-600 mb-4">Veuillez entrer le mot de passe administrateur pour modifier le catalogue.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyPassword(); }}>
              <input
                type="password"
                autoFocus
                placeholder="Mot de passe"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                className={`w-full px-4 py-2 mb-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  passwordError ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500 focus:border-transparent'
                }`}
              />
              {passwordError && (
                <p className="text-xs text-red-500 mb-4">Mot de passe incorrect.</p>
              )}
              
              <div className="flex items-center justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPendingAction(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Nouveau mot de passe
            </h3>
            <p className="text-sm text-slate-600 mb-4">Définissez le nouveau mot de passe d'administration.</p>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
              placeholder="Nouveau mot de passe..."
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoFocus
            />
            <input 
              type="password" 
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2 ${confirmNewPassword && newPassword !== confirmNewPassword ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="Confirmer le mot de passe..."
              value={confirmNewPassword}
              onChange={e => setConfirmNewPassword(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newPassword && newPassword === confirmNewPassword && window.electronAPI) {
                  const res = await window.electronAPI.updateAdminPassword(newPassword);
                  if (res.success) {
                    setShowChangePasswordModal(false);
                    setNewPassword('');
                    setConfirmNewPassword('');
                  } else {
                    setErrorMsg("Erreur: " + res.error);
                  }
                }
              }}
            />
            {confirmNewPassword && newPassword !== confirmNewPassword && (
              <p className="text-xs text-red-500 mb-4">Les mots de passe ne correspondent pas.</p>
            )}
            <div className={`flex items-center justify-end gap-3 ${confirmNewPassword && newPassword !== confirmNewPassword ? 'mt-2' : 'mt-6'}`}>
              <button 
                onClick={() => { setShowChangePasswordModal(false); setNewPassword(''); setConfirmNewPassword(''); }}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={async () => {
                  if (newPassword && newPassword === confirmNewPassword && window.electronAPI) {
                    const res = await window.electronAPI.updateAdminPassword(newPassword);
                    if (res.success) {
                      setShowChangePasswordModal(false);
                      setNewPassword('');
                      setConfirmNewPassword('');
                    } else {
                      setErrorMsg("Erreur: " + res.error);
                    }
                  }
                }}
                disabled={!newPassword || newPassword !== confirmNewPassword}
                className="px-4 py-2 font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
