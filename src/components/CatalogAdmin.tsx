import React, { useState, useEffect } from 'react';
import { Search, Database, Plus, Edit2, Trash2, ArrowLeft, UploadCloud, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComponentRef, Manufacturer } from '../types';

interface CatalogAdminProps {
  onBack: () => void;
}

export const CatalogAdmin: React.FC<CatalogAdminProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'references' | 'manufacturers'>('references');
  
  // References State
  const [refs, setRefs] = useState<ComponentRef[]>([]);
  const [refSearch, setRefSearch] = useState('');
  const [refPage, setRefPage] = useState(1);
  const [refTotal, setRefTotal] = useState(0);
  const refPageSize = 50;

  // Manufacturers State
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufSearch, setManufSearch] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (activeTab === 'references') {
      fetchReferences();
    } else {
      fetchManufacturers();
    }
  }, [activeTab, refPage, refSearch]);

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

  const handleImportExcel = async () => {
    if (!window.electronAPI) return;
    setImporting(true);
    try {
      const res = await window.electronAPI.importExcelCatalog();
      if (res.success) {
        alert('Importation réussie !');
        if (activeTab === 'references') fetchReferences();
        else fetchManufacturers();
      } else {
        if (res.error !== 'Annulé') alert("Erreur lors de l'importation : " + res.error);
      }
    } catch (e) {
      console.error(e);
      alert('Erreur inattendue.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteRef = async (ref: string) => {
    if (!window.confirm(`Supprimer la référence ${ref} ?`)) return;
    const res = await window.electronAPI?.deleteReference(ref);
    if (res?.success) fetchReferences();
    else alert('Erreur : ' + res?.error);
  };

  const handleDeleteManuf = async (code: string) => {
    if (!window.confirm(`Supprimer le fabricant ${code} ?`)) return;
    const res = await window.electronAPI?.deleteManufacturer(code);
    if (res?.success) fetchManufacturers();
    else alert('Erreur : ' + res?.error);
  };

  const totalPages = Math.ceil(refTotal / refPageSize);

  const filteredManufacturers = manufacturers.filter(m => 
    m.name.toLowerCase().includes(manufSearch.toLowerCase()) || 
    m.code.toLowerCase().includes(manufSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
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
        
        <button 
          onClick={handleImportExcel}
          disabled={importing}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          {importing ? (
            <span className="animate-pulse">Importation en cours...</span>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 mr-2" />
              Importer depuis Excel
            </>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => setActiveTab('references')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'references' 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Références
          </button>
          <button
            onClick={() => setActiveTab('manufacturers')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'manufacturers' 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fabricants
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
                placeholder={`Rechercher ${activeTab === 'references' ? 'une référence...' : 'un fabricant...'}`}
                value={activeTab === 'references' ? refSearch : manufSearch}
                onChange={(e) => {
                  if (activeTab === 'references') {
                    setRefSearch(e.target.value);
                    setRefPage(1);
                  } else {
                    setManufSearch(e.target.value);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
              />
            </div>
            {/* Add Button Placeholder (Functionality can be added later) */}
            <button className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </button>
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
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code Fabricant</th>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom du Fabricant</th>
                      <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                          <td className="py-3 px-6 text-sm text-slate-500">{r.weight || '-'}</td>
                          <td className="py-3 px-6 text-right">
                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteRef(r.ref)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-500">Aucune référence trouvée.</td></tr>
                    )
                  ) : (
                    filteredManufacturers.length > 0 ? (
                      filteredManufacturers.map(m => (
                        <tr key={m.code} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-3 px-6 font-mono text-sm text-slate-800">{m.code}</td>
                          <td className="py-3 px-6 text-sm text-slate-600 font-medium">{m.name}</td>
                          <td className="py-3 px-6 text-right">
                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteManuf(m.code)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="py-8 text-center text-slate-500">Aucun fabricant trouvé.</td></tr>
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
    </div>
  );
};
