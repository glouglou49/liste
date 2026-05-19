import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ArrowLeft, Upload, Plus, Download, FileText, Search, Trash2, Minus, ChevronLeft, ChevronRight, Menu, Settings, ArrowUpDown, Calendar, ClipboardList, Sliders } from 'lucide-react';
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
        onClick={(e) => { e.stopPropagation(); onSave(Math.max(0, value - 1)); }}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors focus:outline-none flex items-center justify-center w-8 h-7 text-xs font-bold border border-red-200"
        title="Soustraire 1"
      >
        -1
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); setTempValue(''); setMode('edit-sub'); }}
        className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors focus:outline-none flex items-center justify-center w-7 h-7"
        title="Soustraire à la quantité..."
      >
        <Minus className="w-5 h-5" />
      </button>

      <div
        className="px-2 bg-blue-100 text-blue-800 rounded-md min-w-[2.5rem] cursor-pointer hover:bg-blue-200 transition-colors font-medium text-sm text-center flex items-center justify-center h-7 font-bold"
        onClick={() => { setTempValue(value); setMode('edit-abs'); }}
        title="Modifier la quantité totale"
      >
        {value}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setTempValue(''); setMode('edit-add'); }}
        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors focus:outline-none flex items-center justify-center w-7 h-7"
        title="Ajouter à la quantité..."
      >
        <Plus className="w-5 h-5" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onSave(value + 1); }}
        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors focus:outline-none flex items-center justify-center w-8 h-7 text-xs font-bold border border-emerald-200"
        title="Ajouter 1"
      >
        +1
      </button>
    </div>
  );
}

function EditableReference({ value, onSave, suggestedRefs }: { value: string, onSave: (newRef: string) => void, suggestedRefs: ComponentRef[] }) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [tempValue, setTempValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'edit' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  const handleSave = () => {
    const newVal = tempValue.trim();
    setMode('view');
    if (newVal && newVal !== value) {
      onSave(newVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setMode('view');
  };

  if (mode === 'edit') {
    return (
      <input
        ref={inputRef}
        type="text"
        list="all-refs-list"
        className="w-full px-2 py-1 border border-blue-500 rounded text-sm outline-none bg-white font-bold"
        value={tempValue}
        onChange={e => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div
      onClick={() => { setTempValue(value); setMode('edit'); }}
      className="cursor-pointer hover:bg-slate-200 hover:text-blue-700 px-2 py-1 rounded transition-colors font-bold text-slate-900 truncate max-w-[200px]"
      title="Cliquez pour modifier la référence"
    >
      {value}
    </div>
  );
}

type ColumnId = 'ref' | 'designation' | 'quantity' | 'status' | 'manufacturer' | 'fabCode' | 'listsInfo';

export function ProjectView() {
  const { currentProjectId, currentProject, closeProject, bomLines, manufacturers, addOrUpdateBOMLine, removeBOMLine, updateBOMLineQte, updateBOMLineRef, importBOMData, sublists, addSublist, removeSublist, currentProjectPath } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeView, setActiveView] = useState('Globale');
  const projectSublists = useMemo(() => {
    const lists = sublists.filter(s => s.projectId === currentProjectId);
    if (currentProjectId && !lists.some(s => s.type === 'appro_anticipe' && s.name.toLowerCase() === 'liste achat')) {
      lists.unshift({ id: 'ListeAchat', projectId: currentProjectId, name: 'Liste achat', type: 'appro_anticipe' });
    }
    return lists;
  }, [sublists, currentProjectId]);
  const isListeAchatActive = useMemo(() => {
    const currentSublist = projectSublists.find(s => s.id === activeView);
    return activeView === 'ListeAchat' || (currentSublist && currentSublist.name.toLowerCase().trim() === 'liste achat');
  }, [projectSublists, activeView]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'ref_fab' | 'date' | 'status'>('ref_fab');

  const [columns, setColumns] = useState<Record<ColumnId, { visible: boolean; width: number }>>(() => {
    const saved = localStorage.getItem('project_view_columns_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      ref: { visible: true, width: 200 },
      designation: { visible: true, width: 350 },
      quantity: { visible: true, width: 140 },
      status: { visible: true, width: 150 },
      manufacturer: { visible: true, width: 180 },
      fabCode: { visible: true, width: 150 },
      listsInfo: { visible: true, width: 150 },
    };
  });

  useEffect(() => {
    localStorage.setItem('project_view_columns_v1', JSON.stringify(columns));
  }, [columns]);

  const [showColDropdown, setShowColDropdown] = useState(false);
  const colDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target as Node)) {
        setShowColDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const resizingColumnRef = useRef<{ id: ColumnId; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, id: ColumnId) => {
    e.preventDefault();
    resizingColumnRef.current = {
      id,
      startX: e.clientX,
      startWidth: columns[id].width,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingColumnRef.current) return;
    const { id, startX, startWidth } = resizingColumnRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff);
    setColumns(prev => ({
      ...prev,
      [id]: { ...prev[id], width: newWidth }
    }));
  };

  const handleMouseUp = () => {
    resizingColumnRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

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

    if (activeView === 'Globale') {
      filtered = filtered.filter(l => l.sublistId !== 'Chiffrage');
    } else if (activeView === 'EtatPrepa') {
      const approSublists = projectSublists.filter(s => s.type === 'appro_anticipe').map(s => s.id);
      filtered = filtered.filter(l => approSublists.includes(l.sublistId) && l.sublistId !== 'Chiffrage');
    } else {
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
      if (activeView === 'EtatPrepa') {
        finalFiltered = finalFiltered.filter(l => l.quantity > 0);
      }
    } else {
      finalFiltered = filtered.map(line => {
        const slName = line.sublistId === 'Chiffrage' ? 'Chiffrage' : (projectSublists.find(s => s.id === line.sublistId)?.name || 'Inconnu');
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

  const handleImportFromChiffrage = async () => {
    if (!currentProjectId || !activeView) return;

    const chiffrageLines = bomLines.filter(
      (l) => l.projectId === currentProjectId && l.sublistId === 'Chiffrage'
    );
    if (chiffrageLines.length === 0) {
      alert("Aucune référence trouvée dans la liste Chiffrage.");
      return;
    }

    const mappedData = chiffrageLines.map((line) => ({
      'Référence': line.ref,
      'Quantité': 0,
      '_sublistId': activeView,
      'Catégorie': line.category,
      'Localisation': line.location || ''
    }));

    await importBOMData(currentProjectId, mappedData);
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
    if (!currentProjectId || !newRef || activeView === 'Globale' || activeView === 'EtatPrepa' || activeView === 'Chiffrage') return;

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

              <div className="mt-4 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setActiveView('Chiffrage')}
                  className={`w-full text-left px-2 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'Chiffrage' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Chiffrage
                </button>
              </div>

            </div>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}

        {/* Project Info Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Affaire :</span>
            <span className="font-bold text-slate-800 text-sm">{project.id} {project.nomAffaire ? `- ${project.nomAffaire}` : ''}</span>
          </div>

          <div className="h-4 w-px bg-slate-200 self-center hidden sm:block"></div>

          {project.client && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">Client :</span>
              <span className="font-bold text-slate-800">{project.client}</span>
            </div>
          )}

          {project.nomTableau && (
            <>
              <div className="h-4 w-px bg-slate-200 self-center hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Tableau :</span>
                <span className="font-bold text-slate-800">{project.nomTableau}</span>
              </div>
            </>
          )}

          {project.filialeOrigine && (
            <>
              <div className="h-4 w-px bg-slate-200 self-center hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Filiale :</span>
                <span className="font-bold text-slate-800">{project.filialeOrigine}</span>
              </div>
            </>
          )}

          {project.chargeAffaire && (
            <>
              <div className="h-4 w-px bg-slate-200 self-center hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Chargé d'Affaire :</span>
                <span className="font-bold text-slate-800">{project.chargeAffaire}</span>
              </div>
            </>
          )}

          {project.techName && (
            <>
              <div className="h-4 w-px bg-slate-200 self-center hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Tech BE :</span>
                <span className="font-bold text-slate-800">{project.techName}</span>
              </div>
            </>
          )}

          {(project.isSousTraitance || project.isUF) && (
            <>
              <div className="h-4 w-px bg-slate-200 self-center hidden sm:block"></div>
              <div className="flex items-center gap-2 flex-wrap">
                {project.isSousTraitance && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200" title={project.filialeExecutant ? `Exécutant: ${project.filialeExecutant} (${project.affaireExecutant || '-'} / ${project.ligneExecutant || '-'})` : 'Sous-traitance'}>
                    Sous-traitance {project.filialeExecutant ? `(${project.filialeExecutant})` : ''}
                  </span>
                )}
                {project.isUF && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200" title={project.affaireUF ? `UF Affaire: ${project.affaireUF} (${project.ligneUF || '-'})` : 'UF'}>
                    UF {project.affaireUF ? `(${project.affaireUF})` : ''}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-slate-800">
            {activeView === 'Globale' ? 'Liste globale' : activeView === 'EtatPrepa' ? 'État préparatoire' : activeView === 'Chiffrage' ? 'Chiffrage' : projectSublists.find(s => s.id === activeView)?.name || 'Vue'}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const subName = activeView === 'Globale' ? 'Liste globale' : activeView === 'EtatPrepa' ? 'État préparatoire' : activeView === 'Chiffrage' ? 'Chiffrage' : projectSublists.find(s => s.id === activeView)?.name || 'Vue';
                ExportService.exportToPDF(project, viewLines, subName, currentProjectPath);
              }}
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm font-medium hover:bg-red-100 flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => {
                const subName = activeView === 'Globale' ? 'Liste globale' : activeView === 'EtatPrepa' ? 'État préparatoire' : activeView === 'Chiffrage' ? 'Chiffrage' : projectSublists.find(s => s.id === activeView)?.name || 'Vue';
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

              {/* Colonnes dropdown */}
              <div className="relative" ref={colDropdownRef}>
                <button
                  onClick={() => setShowColDropdown(!showColDropdown)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors bg-white text-slate-700 shadow-sm"
                  title="Afficher/Masquer les colonnes"
                >
                  <Sliders className="w-4 h-4 text-slate-500" />
                  Colonnes
                </button>

                {showColDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Colonnes affichées</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      <label className="flex items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={columns.ref.visible}
                          onChange={(e) => setColumns(prev => ({ ...prev, ref: { ...prev.ref, visible: e.target.checked } }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Référence</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={columns.designation.visible}
                          onChange={(e) => setColumns(prev => ({ ...prev, designation: { ...prev.designation, visible: e.target.checked } }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Désignation</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={columns.quantity.visible}
                          onChange={(e) => setColumns(prev => ({ ...prev, quantity: { ...prev.quantity, visible: e.target.checked } }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Quantité</span>
                      </label>
                      {activeView === 'EtatPrepa' && (
                        <label className="flex items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={columns.status.visible}
                            onChange={(e) => setColumns(prev => ({ ...prev, status: { ...prev.status, visible: e.target.checked } }))}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">Statut</span>
                        </label>
                      )}
                      <label className="flex items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={columns.manufacturer.visible}
                          onChange={(e) => setColumns(prev => ({ ...prev, manufacturer: { ...prev.manufacturer, visible: e.target.checked } }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Fabricant</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={columns.fabCode.visible}
                          onChange={(e) => setColumns(prev => ({ ...prev, fabCode: { ...prev.fabCode, visible: e.target.checked } }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Code Fabricant</span>
                      </label>
                      {(activeView === 'Globale' || activeView === 'EtatPrepa') && (
                        <label className="flex items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={columns.listsInfo.visible}
                            onChange={(e) => setColumns(prev => ({ ...prev, listsInfo: { ...prev.listsInfo, visible: e.target.checked } }))}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">Liste</span>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table 
                className="min-w-full divide-y divide-slate-200 relative"
                style={{
                  tableLayout: 'fixed',
                  width: Object.entries(columns).reduce((acc, [id, col]) => acc + (col.visible ? col.width : 0), 0) + (activeView !== 'Globale' && activeView !== 'EtatPrepa' ? 64 : 0)
                }}
              >
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {columns.ref.visible && (
                      <th style={{ width: columns.ref.width, minWidth: columns.ref.width, maxWidth: columns.ref.width }} className="relative px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                        Référence
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'ref')}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
                        />
                      </th>
                    )}
                    {columns.designation.visible && (
                      <th style={{ width: columns.designation.width, minWidth: columns.designation.width, maxWidth: columns.designation.width }} className="relative px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                        Désignation
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'designation')}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
                        />
                      </th>
                    )}
                    {columns.quantity.visible && (
                      <th style={{ width: columns.quantity.width, minWidth: columns.quantity.width, maxWidth: columns.quantity.width }} className="relative px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                        Qté
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'quantity')}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
                        />
                      </th>
                    )}
                    {activeView === 'EtatPrepa' && columns.status.visible && (
                      <th style={{ width: columns.status.width, minWidth: columns.status.width, maxWidth: columns.status.width }} className="relative px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                        Statut
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'status')}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
                        />
                      </th>
                    )}
                    {columns.manufacturer.visible && (
                      <th style={{ width: columns.manufacturer.width, minWidth: columns.manufacturer.width, maxWidth: columns.manufacturer.width }} className="relative px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                        Fabricant
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'manufacturer')}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
                        />
                      </th>
                    )}
                    {columns.fabCode.visible && (
                      <th style={{ width: columns.fabCode.width, minWidth: columns.fabCode.width, maxWidth: columns.fabCode.width }} className="relative px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                        Code Fab.
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'fabCode')}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
                        />
                      </th>
                    )}
                    {(activeView === 'Globale' || activeView === 'EtatPrepa') && columns.listsInfo.visible && (
                      <th style={{ width: columns.listsInfo.width, minWidth: columns.listsInfo.width, maxWidth: columns.listsInfo.width }} className="relative px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                        Liste
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'listsInfo')}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {viewLines.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={
                          (columns.ref.visible ? 1 : 0) +
                          (columns.designation.visible ? 1 : 0) +
                          (columns.quantity.visible ? 1 : 0) +
                          (activeView === 'EtatPrepa' && columns.status.visible ? 1 : 0) +
                          (columns.manufacturer.visible ? 1 : 0) +
                          (columns.fabCode.visible ? 1 : 0) +
                          ((activeView === 'Globale' || activeView === 'EtatPrepa') && columns.listsInfo.visible ? 1 : 0) +
                          (activeView !== 'Globale' && activeView !== 'EtatPrepa' ? 1 : 0)
                        } 
                        className="px-6 py-12 text-center text-slate-500 font-medium"
                      >
                        {activeView === 'Chiffrage'
                          ? "Aucune ligne pour cette vue. Utilisez l'import Excel."
                          : "Aucune ligne pour cette vue. Utilisez l'import ou l'ajout manuel."}
                      </td>
                    </tr>
                  ) : viewLines.map((line) => {
                    const isFullyOrdered = activeView === 'EtatPrepa' && line.orderedQty === line.quantity;
                    return (
                      <tr 
                        key={line.id} 
                        className={`hover:bg-slate-100/50 transition-colors group ${isFullyOrdered ? 'bg-slate-100/70 text-slate-900' : ''}`}
                      >
                        {columns.ref.visible && (
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm font-bold text-slate-900 truncate" style={{ width: columns.ref.width, minWidth: columns.ref.width, maxWidth: columns.ref.width }} title={line.ref}>
                            {activeView === 'Globale' || activeView === 'EtatPrepa' ? (
                              line.ref
                            ) : (
                              <EditableReference
                                value={line.ref}
                                onSave={(newRef) => updateBOMLineRef(line.id, newRef)}
                                suggestedRefs={suggestedRefs}
                              />
                            )}
                          </td>
                        )}
                        {columns.designation.visible && (
                          <td className="px-6 py-2.5 text-sm text-slate-600 truncate" style={{ width: columns.designation.width, minWidth: columns.designation.width, maxWidth: columns.designation.width }} title={line.designation}>
                            {line.designation}
                          </td>
                        )}
                        {columns.quantity.visible && (
                          <td className={`px-6 py-2.5 whitespace-nowrap text-sm text-center font-medium ${isFullyOrdered ? 'bg-blue-50/10 text-slate-900' : 'bg-blue-50/50 text-slate-900'}`} style={{ width: columns.quantity.width, minWidth: columns.quantity.width, maxWidth: columns.quantity.width }}>
                            {activeView === 'Globale' || activeView === 'EtatPrepa' || activeView === 'Chiffrage' ? (
                              line.quantity
                            ) : (
                              <EditableQuantity
                                value={line.quantity}
                                onSave={(newQty) => updateBOMLineQte(line.id, newQty)}
                              />
                            )}
                          </td>
                        )}
                        {activeView === 'EtatPrepa' && columns.status.visible && (
                          <td className={`px-6 py-2.5 whitespace-nowrap text-sm text-center font-bold ${isFullyOrdered ? 'bg-slate-50/10 text-slate-800' : 'bg-slate-50/50 text-slate-800'}`} style={{ width: columns.status.width, minWidth: columns.status.width, maxWidth: columns.status.width }}>
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
                        {columns.manufacturer.visible && (
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-slate-700 truncate" style={{ width: columns.manufacturer.width, minWidth: columns.manufacturer.width, maxWidth: columns.manufacturer.width }} title={line.manufacturer}>
                            {line.manufacturer}
                          </td>
                        )}
                        {columns.fabCode.visible && (
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm font-mono text-slate-500 truncate" style={{ width: columns.fabCode.width, minWidth: columns.fabCode.width, maxWidth: columns.fabCode.width }} title={line.fabCode}>
                            {line.fabCode}
                          </td>
                        )}
                        {(activeView === 'Globale' || activeView === 'EtatPrepa') && columns.listsInfo.visible && (
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm truncate" style={{ width: columns.listsInfo.width, minWidth: columns.listsInfo.width, maxWidth: columns.listsInfo.width }}>
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
                        {activeView !== 'Globale' && activeView !== 'EtatPrepa' && (
                          <td className="px-6 py-2.5 whitespace-nowrap text-right w-16">
                            <button
                              onClick={() => removeBOMLine(line.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all rounded hover:bg-red-50"
                              title="Supprimer la ligne"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Row add form */}
                  {activeView !== 'Globale' && activeView !== 'EtatPrepa' && activeView !== 'Chiffrage' && (
                    <tr className="bg-slate-50/80">
                      {columns.ref.visible && (
                        <td className="px-6 py-2.5 whitespace-nowrap text-sm" style={{ width: columns.ref.width, minWidth: columns.ref.width, maxWidth: columns.ref.width }}>
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
                      )}
                      {columns.designation.visible && (
                        <td className="px-6 py-2.5 text-sm text-slate-500 truncate" style={{ width: columns.designation.width, minWidth: columns.designation.width, maxWidth: columns.designation.width }}>
                          {newRef ? (refDetails[newRef]?.designation || (suggestedRefs.find(r => r.ref === newRef)?.designation) || 'Saisir une référence...') : 'Saisir une référence'}
                        </td>
                      )}
                      {columns.quantity.visible && (
                        <td className="px-6 py-2.5 whitespace-nowrap text-center" style={{ width: columns.quantity.width, minWidth: columns.quantity.width, maxWidth: columns.quantity.width }}>
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
                      )}
                      {columns.manufacturer.visible && (
                        <td className="px-6 py-2.5 whitespace-nowrap text-sm text-slate-500 truncate" style={{ width: columns.manufacturer.width, minWidth: columns.manufacturer.width, maxWidth: columns.manufacturer.width }}>
                          {newRef ? (manufacturers.find(m => m.code === (refDetails[newRef]?.fabCode || suggestedRefs.find(r => r.ref === newRef)?.fabCode))?.name || '-') : '-'}
                        </td>
                      )}
                      {columns.fabCode.visible && (
                        <td className="px-6 py-2.5 whitespace-nowrap text-sm text-slate-400 font-mono truncate" style={{ width: columns.fabCode.width, minWidth: columns.fabCode.width, maxWidth: columns.fabCode.width }}>
                          {newRef ? (refDetails[newRef]?.fabCode || suggestedRefs.find(r => r.ref === newRef)?.fabCode || '-') : '-'}
                        </td>
                      )}
                      <td className="px-6 py-2.5 whitespace-nowrap text-right w-16">
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
                  {isListeAchatActive && (
                    <button
                      onClick={handleImportFromChiffrage}
                      className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-sm font-medium hover:bg-blue-100 flex items-center gap-2 transition-colors shadow-sm mr-2"
                      title="Importer les références de la liste Chiffrage avec quantité à 0"
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                      Importer de Chiffrage
                    </button>
                  )}
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
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
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
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">
                    {addListModal.type === 'fiche_achat' ? "Nouvelle Fiche achat/reprise" : "Nouvel Appro anticipé"}
                  </h3>
                  <button 
                    onClick={() => setAddListModal({ show: false, type: 'fiche_achat', name: '' })}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={addListModal.name}
                      onChange={e => setAddListModal({ ...addListModal, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white text-sm"
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
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setAddListModal({ show: false, type: 'fiche_achat', name: '' })}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-white transition-colors"
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          )}

          {listToDelete && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
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
      <datalist id="all-refs-list">
        {suggestedRefs.map(r => <option key={r.ref} value={r.ref}>{r.designation}</option>)}
      </datalist>
    </div>
  );
}
