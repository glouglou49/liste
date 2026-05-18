import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { CatalogAdmin } from './components/CatalogAdmin';
import { UpdateNotifier } from './components/UpdateNotifier';

export default function App() {
  const { currentProjectId, isLoaded, loadState } = useStore();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      loadState();
    }
  }, [isLoaded, loadState]);

  if (!isLoaded) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="animate-pulse text-slate-400">Chargement de la base de données...</div></div>;
  }

  return (
    <div className="h-screen w-full bg-slate-100 overflow-hidden font-sans flex flex-col">
      <UpdateNotifier />
      {showAdmin ? (
        <CatalogAdmin onBack={() => setShowAdmin(false)} />
      ) : currentProjectId ? (
        <ProjectView />
      ) : (
        <Dashboard onOpenAdmin={() => setShowAdmin(true)} />
      )}
    </div>
  );
}
