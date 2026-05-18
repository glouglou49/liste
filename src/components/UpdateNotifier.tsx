import React, { useEffect, useState } from 'react';
import { Download, X, Sparkles } from 'lucide-react';

const CURRENT_VERSION = '1.0.0'; // Version actuelle de l'application

interface ReleaseInfo {
  tagName: string;
  name: string;
  body: string;
  url: string;
}

export function UpdateNotifier() {
  const [newRelease, setNewRelease] = useState<ReleaseInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Ne pas relancer la vérification si déjà rejeté pour cette session
    if (sessionStorage.getItem('update-dismissed') === 'true') {
      return;
    }

    const checkUpdates = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/glouglou49/liste/releases/latest');
        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.tag_name;

        // Comparaison robuste de version
        const clean = (v: string) => v.replace(/^v/, '').split('.').map(Number);
        const currParts = clean(CURRENT_VERSION);
        const lateParts = clean(latestVersion);
        
        let isNewer = false;
        for (let i = 0; i < Math.max(currParts.length, lateParts.length); i++) {
          const curr = currParts[i] || 0;
          const late = lateParts[i] || 0;
          if (late > curr) {
            isNewer = true;
            break;
          }
          if (curr > late) {
            break;
          }
        }

        if (isNewer) {
          setNewRelease({
            tagName: latestVersion,
            name: data.name || latestVersion,
            body: data.body || '',
            url: data.html_url
          });
        }
      } catch (err) {
        console.error('Erreur lors de la vérification des mises à jour :', err);
      }
    };

    checkUpdates();
  }, []);

  const handleUpdateClick = async () => {
    if (newRelease && window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(newRelease.url);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('update-dismissed', 'true');
  };

  if (!newRelease || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg relative z-50 shrink-0 border-b border-indigo-800">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <span className="flex p-2 rounded-lg bg-indigo-800/80 shrink-0 animate-bounce">
            <Sparkles className="h-5 w-5 text-yellow-300" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-sm sm:text-base flex items-center gap-2">
              <span>Mise à jour disponible : <span className="bg-yellow-400 text-slate-900 text-xs px-2 py-0.5 rounded-full font-extrabold">{newRelease.tagName}</span></span>
              <span className="hidden md:inline text-indigo-100 font-normal text-xs">- {newRelease.name}</span>
            </p>
            <p className="text-xs text-indigo-100 line-clamp-1 mt-0.5">
              Une nouvelle version est disponible sur GitHub. Cliquez sur Télécharger pour installer la version la plus récente et profiter des dernières améliorations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleUpdateClick}
            className="flex items-center justify-center px-4 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-extrabold text-indigo-700 bg-white hover:bg-indigo-50 transition-all flex-row gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger la v{newRelease.tagName.replace(/^v/, '')}
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
            title="Plus tard"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
