import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ArrowLeft, Upload, Plus, Download, FileText, Search, Trash2, Minus, ChevronLeft, ChevronRight, Menu, Settings, ArrowUpDown, Calendar, ClipboardList } from 'lucide-react';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { Category, ComponentRef, Project } from '../types';
import * as XLSX from 'xlsx';
import { ExportService } from '../services/ExportService';

const VIEWS = ['Globale', 'Tôlerie', 'Électronique', 'Appro Anticipé'];

function EditableQuantity({ value, onSave }: { value: number, onSave: (val: number) => void }) {
  const [mode, setMode] = useState<'view' | 'edit-abs' | 'edit-add' | 'edit-sub'>('view');
  const [tempValue, setTempValue] = useState<number | ''>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'view' && inputRef.current) {
      inputRef.current.focus();
      if (mode === 'edit-abs') inputRef.current.select();
    }
  }, [mode]);

  const handleSave = () => {
    let newVal = value;
    const inputVal = typeof tempValue === 'number' ? tempValue : 0;

    if (mode === 'edit-abs') {
      newVal = inputVal;
    } else if (mode === 'edit-add') {
      newVal = value + inputVal;
    } else if (mode === 'edit-sub') {
      newVal = value - inputVal;
    }

    setMode('view');
    if (newVal !== value) {
      onSave(newVal);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setMode('view');
  };

  if (mode !== 'view') {
    return (
      <div className="flex items-center justify-center gap-1 h-7">
        {mode === 'edit-add' && <span className="text-emerald-600 font-bold text-xs">+</span>}
        {mode === 'edit-sub' && <span className="text-red-600 font-bold text-xs">-</span>}
        <input
          ref={inputRef}
          type="number"
          className="w-16 h-7 px-1 text-center border-2 border-blue-500 rounded text-sm outline-none bg-white"
          value={tempValue}
          onChange={e => setTempValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 h-7">
      <button
        onClick={(e) => { e.stopPropagation(); setTempValue(''); setMode('edit-add'); }}
        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors focus:outline-none flex items-center justify-center w-7 h-7"
        title="Ajouter à la quantité"
      >
        <Plus className="w-5 h-5" />
      </button>

      <div
        className="px-2 bg-blue-100 text-blue-800 rounded-md min-w-[2.5rem] cursor-pointer hover:bg-blue-200 transition-colors font-medium text-sm text-center flex items-center justify-center h-7"
        onClick={() => { setTempValue(value); setMode('edit-abs'); }}
        title="Modifier la quantité totale"
      >
        {value}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setTempValue(''); setMode('edit-sub'); }}
        className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors focus:outline-none flex items-center justify-center w-7 h-7"
        title="Soustraire de la quantité"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
}

export function ProjectView() {
  const { currentProjectId, currentProject, closeProject, bomLines, manufacturers, addOrUpdateBOMLine, removeBOMLine, updateBOMLineQte, importBOMData, sublists, addSublist, removeSublist, currentProjectPath } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeView, setActiveView] = useState('Globale');
  const projectSublists = useMemo(() => {
    const lists = sublists.filter(s => s.projectId === currentProjectId);
    if (currentProjectId && !lists.some(s => s.type === 'appro_anticipe' && s.name.toLowerCase() === 'liste achat')) {
      lists.unshift({ id: 'ListeAchat', projectId: currentProjectId, name: 'Liste achat', type: 'appro_anticipe' });
    }
    return lists;
  }, [sublists, currentProjectId]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'ref_fab' | 'date' | 'status'>('ref_fab');

  useEffect(() => {
    if (activeView !== 'EtatPrepa' && sortBy === 'status') {
      setSortBy('ref_fab');
    }
  }, [activeView, sortBy]);

  // Saisie manuelle
  const [newRef, setNewRef] = useState('');
  const [newQty, setNewQty] = useState<number | ''>(1);
  const [newLocation, setNewLocation] = useState('');

  // Détails des références pour l'affichage (Cache local)
  const [refDetails, setRefDetails] = useState<Record<string, ComponentRef>>({});
  // Suggestions pour l'autocomplétion
  const [suggestedRefs, setSuggestedRefs] = useState<ComponentRef[]>([]);

  // Charger les détails des références présentes dans la BOM
  useEffect(() => {
    const fetchRefDetails = async () => {
      if (!window.electronAPI) return;
      const uniqueRefs = Array.from(new Set(bomLines.filter(l => l.projectId === currentProjectId).map(l => l.ref)));
      const missingRefs = uniqueRefs.filter(ref => !refDetails[ref]);

      if (missingRefs.length > 0) {
        const newDetails = { ...refDetails };
        for (const ref of missingRefs) {
          const detail = await window.electronAPI.getReference(ref);
          if (detail) {
            newDetails[ref] = detail;
          }
        }
        setRefDetails(newDetails);
      }
    };
    fetchRefDetails();
  }, [bomLines, currentProjectId]);

  // Gérer les suggestions d'autocomplétion
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (newRef.length >= 2 && window.electronAPI) {
        const results = await window.electronAPI.searchReferences(newRef);
        setSuggestedRefs(results);
      } else {
        setSuggestedRefs([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newRef]);

  const project = currentProject;

  const viewLines = useMemo(() => {
    let filtered = bomLines.filter(l => l.projectId === currentProjectId);

    if (activeView === 'EtatPrepa') {
      const approSublists = projectSublists.filter(s => s.type === 'appro_anticipe').map(s => s.id);
      filtered = filtered.filter(l => approSublists.includes(l.sublistId));
    } else if (activeView !== 'Globale') {
      filtered = filtered.filter(l => l.sublistId === activeView);
    }

    if (searchTerm) {
      filtered = filtered.filter(l =>
        l.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.location || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const mfgMap = new Map(manufacturers.map(m => [m.code, m]));

    let finalFiltered: (typeof filtered[0] & { listsInfo: string[], orderedQty?: number })[] = [];

    if (activeView === 'Globale' || activeView === 'EtatPrepa') {
      const mergedMap = new Map<string, typeof filtered[0] & { listsInfo: string[], orderedQty?: number }>();
      for (const line of filtered) {
        // An item is considered ordered if it's in a sublist other than the 'liste achat' (case insensitive)
        const slName = projectSublists.find(s => s.id === line.sublistId)?.name || '';
        const isListeAchat = line.sublistId === 'ListeAchat' || slName.toLowerCase().trim() === 'liste achat';
        const isOrdered = !isListeAchat;
        const qteOrdered = isOrdered ? line.quantity : 0;

        if (mergedMap.has(line.ref)) {
          const existing = mergedMap.get(line.ref)!;
          existing.quantity += line.quantity;
          if (activeView === 'EtatPrepa') {
            existing.orderedQty = (existing.orderedQty || 0) + qteOrdered;
          }
          const slName = projectSublists.find(s => s.id === line.sublistId)?.name || 'Inconnu';
          if (!existing.listsInfo.includes(slName)) {
            existing.listsInfo.push(slName);
          }
        } else {
          const slName = projectSublists.find(s => s.id === line.sublistId)?.name || 'Inconnu';
          mergedMap.set(line.ref, { 
            ...line, 
            listsInfo: [slName],
            orderedQty: activeView === 'EtatPrepa' ? qteOrdered : undefined
          });
        }
      }
      finalFiltered = Array.from(mergedMap.values());
    } else {
      finalFiltered = filtered.map(line => {
        const slName = projectSublists.find(s => s.id === line.sublistId)?.name || 'Inconnu';
        return { ...line, listsInfo: [slName] };
      });
    }

    return finalFiltered.map(line => {
      const refDetail = refDetails[line.ref];
      const mfgDetail = mfgMap.get(refDetail?.fabCode || '');
      return {
        ...line,
        designation: refDetail?.designation || 'En attente...',
        weight: refDetail?.weight || 0,
        manufacturer: mfgDetail?.name || 'Inconnu',
        fabCode: refDetail?.fabCode || '-'
      };
    }).sort((a, b) => {
      if (sortBy === 'status') {
        const getStatusPriority = (line: typeof a) => {
          const total = line.quantity;
          const ord = line.orderedQty || 0;
          if (ord === 0) return 1;
          if (ord < total) return 2;
          return 3;
        };
        const prioA = getStatusPriority(a);
        const prioB = getStatusPriority(b);
        if (prioA !== prioB) {
          return prioA - prioB;
        }
        // Fallback to manufacturer code then reference if same status
        const fabComp = a.fabCode.localeCompare(b.fabCode, undefined, { numeric: true, sensitivity: 'base' });
        if (fabComp !== 0) return fabComp;
        return a.ref.localeCompare(b.ref, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === 'date') {
        const indexA = bomLines.findIndex(l => l.projectId === currentProjectId && l.ref === a.ref);
        const indexB = bomLines.findIndex(l => l.projectId === currentProjectId && l.ref === b.ref);
        return (indexA !== -1 ? indexA : 99999) - (indexB !== -1 ? indexB : 99999);
      } else {
        const fabComp = a.fabCode.localeCompare(b.fabCode, undefined, { numeric: true, sensitivity: 'base' });
        if (fabComp !== 0) return fabComp;
        return a.ref.localeCompare(b.ref, undefined, { numeric: true, sensitivity: 'base' });
      }
    });
  }, [bomLines, currentProjectId, activeView, searchTerm, refDetails, manufacturers, sortBy]);

  interface ImportConfig {
    sheetIndex: number;
    dataStartRow: number;
    refCol: string;
    qtyCol: string;
  }

  const [pendingImports, setPendingImports] = useState<{ file: File, wb: any }[]>([]);
  const [importConfig, setImportConfig] = useState<ImportConfig>({ sheetIndex: 0, dataStartRow: 2, refCol: 'A', qtyCol: 'B' });
  const [showImportModal, setShowImportModal] = useState(false);

  const [addListModal, setAddListModal] = useState<{ show: boolean, type: 'fiche_achat' | 'appro_anticipe', name: string }>({ show: false, type: 'fiche_achat', name: '' });
  const [listToDelete, setListToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !currentProjectId) return;

    const parsed = await Promise.all(files.map((file) => new Promise<{ file: File, wb: any }>((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        if (bstr) {
          const wb = XLSX.read(bstr, { type: 'binary' });
          resolve({ file, wb });
        }
      };
      reader.readAsBinaryString(file);
    })));

    setPendingImports(parsed);
    setImportConfig({ sheetIndex: 0, dataStartRow: 2, refCol: 'A', qtyCol: 'B' });
    setShowImportModal(true);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    let allMappedData: any[] = [];

    for (const { wb } of pendingImports) {
      const sheetName = wb.SheetNames[importConfig.sheetIndex] || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      const dataRows = XLSX.utils.sheet_to_json<any>(ws, { header: "A", defval: "" });

      for (let i = Math.max(0, importConfig.dataStartRow - 1); i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row) continue;
        const refStr = (row[importConfig.refCol] || '').toString().trim();
        const qtyRaw = row[importConfig.qtyCol];

        let qtyNum = 1;
        if (qtyRaw !== undefined && qtyRaw !== null && qtyRaw !== '') {
          const parsed = parseFloat(qtyRaw.toString().replace(',', '.'));
          if (!isNaN(parsed) && parsed > 0) {
            qtyNum = parsed;
          }
        }

        if (refStr && refStr !== '-' && refStr.toLowerCase() !== 'référence' && refStr.toLowerCase() !== 'reference') {
          allMappedData.push({
            'Référence': refStr,
            'Quantité': qtyNum,
            '_sublistId': activeView,
            'Localisation': ''
          });
        }
      }
    }

    if (allMappedData.length > 0 && currentProjectId) {
      importBOMData(currentProjectId, allMappedData);
    }
    setShowImportModal(false);
    setPendingImports([]);
  };

  const handleRefBlur = async () => {
    if (!newRef) return;
    let finalRef = newRef.trim();
    const exactMatch = suggestedRefs.find(r => r.ref.toLowerCase() === finalRef.toLowerCase());
    if (exactMatch) {
      setNewRef(exactMatch.ref);
    } else if (window.electronAPI) {
      const searchRes = await window.electronAPI.searchReferences(finalRef);
      const exactSearchMatch = searchRes.find(r => r.ref.toLowerCase() === finalRef.toLowerCase());
      if (exactSearchMatch) {
        setNewRef(exactSearchMatch.ref);
        setSuggestedRefs(prev => [...prev.filter(p => p.ref !== exactSearchMatch.ref), exactSearchMatch]);
      }
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProjectId || !newRef || activeView === 'Globale' || activeView === 'EtatPrepa') return;

    let finalRef = newRef.trim();

    // Try to find exact match (case insensitive) in suggestedRefs first
    const exactMatch = suggestedRefs.find(r => r.ref.toLowerCase() === finalRef.toLowerCase());
    if (exactMatch) {
      finalRef = exactMatch.ref;
    } else if (window.electronAPI) {
      // Or ask backend if there is an exact case-insensitive match
      const searchRes = await window.electronAPI.searchReferences(finalRef);
      const exactSearchMatch = searchRes.find(r => r.ref.toLowerCase() === finalRef.toLowerCase());
      if (exactSearchMatch) {
        finalRef = exactSearchMatch.ref;
      }
    }

    addOrUpdateBOMLine({
      projectId: currentProjectId,
      ref: finalRef,
      quantity: typeof newQty === 'number' && !isNaN(newQty) ? newQty : 1,
      sublistId: activeView,
      location: newLocation
    });

    setNewRef('');
    setNewQty(1);
    setNewLocation('');
  };

  if (!project) return <div>Projet non trouvé</div>;

  const handleUpdateSettings = async (data: Partial<Project>) => {
    await useStore.getState().updateProjectSettings(data);
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex h-full bg-slate-50">

      {/* Sidebar for Sublists */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-16'}`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          {isSidebarOpen && (
            <div className="flex items-center gap-3 overflow-hidden">
              <button
                onClick={() => closeProject()}
                className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-800 text-sm truncate" title={project.nomAffaire || `Affaire ${project.id}`}>
                  {project.nomAffaire ? `${project.id} - ${project.nomAffaire}` : `Affaire ${project.id}`}
                </h2>
                <p className="text-xs text-slate-500 truncate" title={project.client ? `Client: ${project.client}` : ''}>
                  {project.client ? `${project.client} • ` : ''}{project.techName}
                </p>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600 shrink-0"
                title="Modifier les paramètres de l'affaire"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 shrink-0 ${!isSidebarOpen ? 'mx-auto' : ''}`}
          >
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${isSidebarOpen ? 'p-4' : 'hidden'}`}>

          <div>
            <button
              onClick={() => setActiveView('Globale')}
              className={`w-full text-left px-2 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'Globale' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Liste globale
            </button>
            <div className="pl-2 mt-2 space-y-1 border-l-2 border-slate-100 ml-1">
              {projectSublists.filter(s => s.type === 'fiche_achat').map(s => (
                <div key={s.id} className="flex items-center group pr-2">
                  <button
                    onClick={() => setActiveView(s.id)}
                    className={`flex-1 text-left px-2 py-1.5 rounded-md text-sm transition-colors ${activeView === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span className="truncate block max-w-[150px]" title={s.name}>{s.name}</span>
                  </button>
                  <button
                    onClick={() => setListToDelete({ id: s.id, name: s.name })}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAddListModal({ show: true, type: 'fiche_achat', name: '' })}
                className="text-left w-full px-2 py-1.5 text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3 shrink-0" /> <span className="truncate">Ajouter une fiche achat</span>
              </button>

              <div className="mt-4">
                <button
                  onClick={() => setActiveView('EtatPrepa')}
                  className={`w-full text-left px-2 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'EtatPrepa' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  État préparatoire
                </button>
                <div className="pl-2 mt-2 space-y-1 border-l-2 border-slate-100 ml-1">
                  {projectSublists.filter(s => s.type === 'appro_anticipe').map(s => (
                    <div key={s.id} className="flex items-center group pr-2">
                      <button
                        onClick={() => setActiveView(s.id)}
                        className={`flex-1 text-left px-2 py-1.5 rounded-md text-sm transition-colors ${activeView === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        <span className="truncate block max-w-[150px]" title={s.name}>{s.name}</span>
                      </button>
                      {s.name.toLowerCase() !== 'liste achat' && (
                        <button
                          onClick={() => setListToDelete({ id: s.id, name: s.name })}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setAddListModal({ show: true, type: 'appro_anticipe', name: '' })}
                    className="text-left w-full px-2 py-1.5 text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3 shrink-0" /> <span className="truncate">Ajouter un appro anticipé</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}

        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-slate-800">
            {activeView === 'Globale' ? 'Liste globale' : activeView === 'EtatPrepa' ? 'État préparatoire' : projectSublists.find(s => s.id === activeView)?.name || 'Vue'}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const subName = activeView === 'Globale' ? 'Liste globale' : activeView === 'EtatPrepa' ? 'État préparatoire' : projectSublists.find(s => s.id === activeView)?.name || 'Vue';
                ExportService.exportToPDF(project, viewLines, subName, currentProjectPath);
              }}
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm font-medium hover:bg-red-100 flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => {
                const subName = activeView === 'Globale' ? 'Liste globale' : activeView === 'EtatPrepa' ? 'État préparatoire' : projectSublists.find(s => s.id === activeView)?.name || 'Vue';
                ExportService.exportToExcel(project, viewLines, subName, currentProjectPath);
              }}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-sm font-medium hover:bg-emerald-100 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </header>


        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col p-6">

          {/* Navigation & Controls */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex-1"></div>
            <div className="flex items-center gap-3">
              {/* Boutons de sélection du tri */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                <button
                  onClick={() => setSortBy('ref_fab')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    sortBy === 'ref_fab'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Trier par référence et par fabricant"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Tri Réf / Fab
                </button>
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    sortBy === 'date'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Trier par date d'ajout"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Tri Date d'ajout
                </button>
                {activeView === 'EtatPrepa' && (
                  <button
                    onClick={() => setSortBy('status')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      sortBy === 'status'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Trier par statut"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Tri Statut
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une réf..."
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 relative">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Référence</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Désignation</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Qté</th>
                    {activeView === 'EtatPrepa' && <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-36">Statut</th>}
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fabricant</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Code Fab.</th>
                    {(activeView === 'Globale' || activeView === 'EtatPrepa') && <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Liste</th>}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {viewLines.length === 0 ? (
                    <tr>
                      <td colSpan={activeView === 'Globale' ? 7 : activeView === 'EtatPrepa' ? 8 : 6} className="px-6 py-12 text-center text-slate-500 font-medium">
                        Aucune ligne pour cette vue. Utilisez l'import ou l'ajout manuel.
                      </td>
                    </tr>
                  ) : viewLines.map((line) => {
                    const isFullyOrdered = activeView === 'EtatPrepa' && line.orderedQty === line.quantity;
                    return (
                      <tr 
                        key={line.id} 
                        className={`hover:bg-slate-100/50 transition-colors group ${isFullyOrdered ? 'bg-slate-100/70 text-slate-900' : ''}`}
                      >
                        <td className="px-6 py-2.5 whitespace-nowrap text-sm font-bold text-slate-900">{line.ref}</td>
                        <td className="px-6 py-2.5 text-sm text-slate-600">{line.designation}</td>
                        <td className={`px-6 py-2.5 whitespace-nowrap text-sm text-center font-medium ${isFullyOrdered ? 'bg-blue-50/10 text-slate-900' : 'bg-blue-50/50 text-slate-900'}`}>
                          {activeView === 'Globale' || activeView === 'EtatPrepa' ? (
                            line.quantity
                          ) : (
                            <EditableQuantity
                              value={line.quantity}
                              onSave={(newQty) => updateBOMLineQte(line.id, newQty)}
                            />
                          )}
                        </td>
                        {activeView === 'EtatPrepa' && (
                          <td className={`px-6 py-2.5 whitespace-nowrap text-sm text-center font-bold ${isFullyOrdered ? 'bg-slate-50/10 text-slate-800' : 'bg-slate-50/50 text-slate-800'}`}>
                            {(() => {
                              const total = line.quantity;
                              const ord = line.orderedQty || 0;
                              if (ord === total) return "Commandé";
                              if (ord === 0) return "À commander";
                              const formatQty = (v: number) => Number.isInteger(v) ? v.toString() : v.toFixed(2).replace('.', ',');
                              return `${formatQty(ord)} Commandé`;
                            })()}
                          </td>
                        )}
                        <td className="px-6 py-2.5 whitespace-nowrap text-sm text-slate-700">{line.manufacturer}</td>
                        <td className="px-6 py-2.5 whitespace-nowrap text-sm font-mono text-slate-500">{line.fabCode}</td>
                        {(activeView === 'Globale' || activeView === 'EtatPrepa') && (
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm">
                            <div className="flex flex-wrap gap-1">
                              {line.listsInfo.map((cat) => (
                                <span 
                                  key={cat} 
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                        )}
                      <td className="px-6 py-2.5 whitespace-nowrap text-right">
                        {activeView !== 'Globale' && activeView !== 'EtatPrepa' && (
                          <button
                            onClick={() => removeBOMLine(line.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all rounded hover:bg-red-50"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                  {/* Row add form */}
                  {activeView !== 'Globale' && activeView !== 'EtatPrepa' && (
                    <tr className="bg-slate-50/80">
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm">
                        <input
                          type="text"
                          placeholder="Nouvelle réf..."
                          list="refs"
                          className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-md text-sm"
                          value={newRef}
                          onChange={e => setNewRef(e.target.value)}
                          onBlur={handleRefBlur}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newRef) {
                              e.preventDefault();
                              handleManualAdd(e);
                            }
                          }}
                        />
                        <datalist id="refs">
                          {suggestedRefs.map(r => <option key={r.ref} value={r.ref}>{r.designation}</option>)}
                        </datalist>
                      </td>
                      <td className="px-6 py-2.5 text-sm text-slate-500">
                        {newRef ? (refDetails[newRef]?.designation || (suggestedRefs.find(r => r.ref === newRef)?.designation) || 'Saisir une référence...') : 'Saisir une référence'}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-center">
                        <input
                          type="number" min="1" step="0.1" required
                          className="w-16 px-1 py-1.5 border border-slate-300 bg-white rounded-md text-sm text-center"
                          value={newQty}
                          onChange={e => setNewQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newRef) {
                              e.preventDefault();
                              handleManualAdd(e);
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-slate-500">
                        {newRef ? (manufacturers.find(m => m.code === (refDetails[newRef]?.fabCode || suggestedRefs.find(r => r.ref === newRef)?.fabCode))?.name || '-') : '-'}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-slate-400 font-mono">
                        {newRef ? (refDetails[newRef]?.fabCode || suggestedRefs.find(r => r.ref === newRef)?.fabCode || '-') : '-'}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-right">
                        <button
                          onClick={handleManualAdd}
                          disabled={!newRef}
                          className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Ajouter"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {activeView !== 'Globale' && activeView !== 'EtatPrepa' && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleImport}
                />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">Importer une liste pour la vue <strong>{activeView}</strong> :</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm"
                    title="Importer des fichiers Excel"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    Importer
                  </button>
                </div>
              </div>
            )}
          </div>

          {showImportModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Configuration d'importation</h3>
                  <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                  <div className="text-sm text-slate-600 bg-blue-50 border border-blue-100 p-3 rounded-md">
                    Cette configuration sera appliquée à <strong>{pendingImports.length} fichier{pendingImports.length > 1 ? 's' : ''}</strong> d'importation dans la vue <strong>{activeView}</strong>.
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Feuille à importer</label>
                      <select
                        value={importConfig.sheetIndex}
                        onChange={e => setImportConfig({ ...importConfig, sheetIndex: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      >
                        {pendingImports.length > 0 && pendingImports[0].wb.SheetNames.map((name: string, idx: number) => (
                          <option key={name} value={idx}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ligne de début des données</label>
                      <input
                        type="number" min="1"
                        value={importConfig.dataStartRow}
                        onChange={e => setImportConfig({ ...importConfig, dataStartRow: Math.max(1, parseInt(e.target.value)) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">Ligne Excel où commencent les articles (ex: 2 si l'en-tête est en 1).</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                      {(() => {
                        if (pendingImports.length === 0) return null;
                        const wb = pendingImports[0].wb;
                        const sheetName = wb.SheetNames[importConfig.sheetIndex] || wb.SheetNames[0];
                        const ws = wb.Sheets[sheetName];
                        if (!ws) return null;

                        const dataRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
                        const options = [];
                        const startRowIdx = Math.max(0, importConfig.dataStartRow - 1);

                        for (let c = 0; c < 26; c++) {
                          const colLetter = String.fromCharCode(65 + c);
                          const vals = [];
                          for (let r = startRowIdx; r < Math.min(startRowIdx + 15, dataRows.length); r++) {
                            if (dataRows[r] && dataRows[r][c] !== undefined && dataRows[r][c] !== null && String(dataRows[r][c]).trim() !== '') {
                              vals.push(String(dataRows[r][c]).trim());
                            }
                          }

                          let headerVal = '';
                          if (dataRows[0] && dataRows[0][c] !== undefined && String(dataRows[0][c]).trim() !== '') {
                            headerVal = String(dataRows[0][c]).trim();
                          }

                          let label = `[${colLetter}]`;
                          if (vals.length > 0) {
                            label += ` ${vals[0]}`;
                            if (vals.length > 1) {
                              label += ` (ex: ${vals[1]})`;
                            }
                          } else if (headerVal) {
                            label += ` ${headerVal}`;
                          } else {
                            label += ` Colonne ${c + 1}`;
                          }

                          if (label.length > 90) label = label.substring(0, 90) + '...';
                          options.push(<option key={colLetter} value={colLetter}>{label}</option>);
                        }

                        return (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Colonne Référence *</label>
                              <select
                                value={importConfig.refCol}
                                onChange={e => setImportConfig({ ...importConfig, refCol: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                              >
                                <option value="">Sélectionner...</option>
                                {options}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Colonne Quantité</label>
                              <select
                                value={importConfig.qtyCol}
                                onChange={e => setImportConfig({ ...importConfig, qtyCol: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                              >
                                <option value="">Sélectionner...</option>
                                {options}
                              </select>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setPendingImports([]);
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmImport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Importer via cette configuration
                  </button>
                </div>
              </div>
            </div>
          )}
          {addListModal.show && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  {addListModal.type === 'fiche_achat' ? "Nouvelle Fiche achat/reprise" : "Nouvel Appro anticipé"}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={addListModal.name}
                      onChange={e => setAddListModal({ ...addListModal, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter' && addListModal.name.trim()) {
                          e.preventDefault();
                          const trimmedName = addListModal.name.trim();
                          if (addListModal.type === 'appro_anticipe' && trimmedName.toLowerCase() === 'liste achat') {
                            alert("Cette liste existe déjà par défaut.");
                            return;
                          }
                          addSublist({ projectId: currentProjectId!, name: trimmedName, type: addListModal.type });
                          setAddListModal({ show: false, type: 'fiche_achat', name: '' });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setAddListModal({ show: false, type: 'fiche_achat', name: '' })}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const trimmedName = addListModal.name.trim();
                      if (trimmedName) {
                        if (addListModal.type === 'appro_anticipe' && trimmedName.toLowerCase() === 'liste achat') {
                          alert("Cette liste existe déjà par défaut.");
                          return;
                        }
                        addSublist({ projectId: currentProjectId!, name: trimmedName, type: addListModal.type });
                        setAddListModal({ show: false, type: 'fiche_achat', name: '' });
                      }
                    }}
                    disabled={!addListModal.name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          )}

          {listToDelete && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    Supprimer la liste
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Êtes-vous sûr de vouloir supprimer la liste <strong>{listToDelete.name}</strong> ? Cette action est irréversible.
                  </p>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => setListToDelete(null)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={() => {
                      removeSublist(listToDelete.id);
                      if (activeView === listToDelete.id) setActiveView('Globale');
                      setListToDelete(null);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {isSettingsOpen && (
        <ProjectSettingsModal 
          initialData={project}
          isEditMode={true}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleUpdateSettings}
        />
      )}
    </div>
  );
}
