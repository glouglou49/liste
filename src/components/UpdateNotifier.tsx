import React, { useEffect, useState } from 'react';
import { Download, X, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

interface ReleaseInfo {
  version: string;
  releaseNotes?: string;
}

export function UpdateNotifier() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Ne pas relancer si fermé par l'utilisateur
    if (sessionStorage.getItem('update-dismissed') === 'true') {
      return;
    }

    if (!window.electronAPI?.checkForUpdates) {
      return; // L'environnement ne supporte pas l'auto-updater (ex: navigateur web pur)
    }

    // Enregistrement des écouteurs
    window.electronAPI.onUpdateAvailable((_event, info) => {
      setReleaseInfo({ version: info.version, releaseNotes: info.releaseNotes });
      setStatus('available');
      // Le téléchargement démarre automatiquement grâce à autoDownload = true côté main
      setStatus('downloading'); 
    });

    window.electronAPI.onDownloadProgress((_event, progressObj) => {
      setStatus('downloading');
      setProgress(progressObj.percent);
    });

    window.electronAPI.onUpdateDownloaded((_event, info) => {
      setReleaseInfo({ version: info.version, releaseNotes: info.releaseNotes });
      setStatus('downloaded');
      setProgress(100);
    });

    window.electronAPI.onUpdateError((_event, error) => {
      console.error('Erreur de mise à jour:', error);
      // En mode développement, c'est normal d'avoir une erreur. On reste discret.
      setStatus('error');
    });

    // Lancer la vérification
    window.electronAPI.checkForUpdates().catch(console.error);

    return () => {
      window.electronAPI?.removeAllUpdateListeners();
    };
  }, []);

  const handleRestart = async () => {
    if (window.electronAPI?.quitAndInstall) {
      await window.electronAPI.quitAndInstall();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('update-dismissed', 'true');
  };

  if (dismissed || status === 'idle' || status === 'checking' || status === 'error') {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg relative z-50 shrink-0 border-b border-indigo-800">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-4">
        
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <span className="flex p-2 rounded-lg bg-indigo-800/80 shrink-0 animate-bounce">
            {status === 'downloaded' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Sparkles className="h-5 w-5 text-yellow-300" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm sm:text-base flex items-center gap-2">
              <span>Mise à jour v{releaseInfo?.version || '...'}</span>
              
              {status === 'downloading' && (
                <span className="text-xs bg-blue-500/50 px-2 py-0.5 rounded font-normal animate-pulse">
                  Téléchargement en cours...
                </span>
              )}
              {status === 'downloaded' && (
                <span className="text-xs bg-emerald-500 px-2 py-0.5 rounded font-bold">
                  Prête à installer
                </span>
              )}
            </p>
            
            {status === 'downloading' ? (
              <div className="mt-1.5 w-full max-w-md bg-indigo-900/50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-indigo-100 line-clamp-1 mt-0.5">
                La toute dernière version a été téléchargée en arrière-plan. Redémarrez l'application pour l'appliquer.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {status === 'downloading' && (
            <div className="text-xs font-bold text-indigo-200 tabular-nums">
              {Math.round(progress)}%
            </div>
          )}

          {status === 'downloaded' && (
            <button
              onClick={handleRestart}
              className="flex items-center justify-center px-4 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-extrabold text-indigo-700 bg-white hover:bg-indigo-50 transition-all flex-row gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Redémarrer et Installer
            </button>
          )}
          
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
            title="Masquer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
