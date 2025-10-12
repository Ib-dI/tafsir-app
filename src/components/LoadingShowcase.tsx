"use client";

import { useState } from "react";
import AudioLoadingState from "./AudioLoadingState";
import LazyVerseLoader from "./LazyVerseLoader";
import LoadingSkeleton from "./LoadingSkeleton";
import LoadingSpinner from "./LoadingSpinner";
import ProgressRestorationLoader from "./ProgressRestorationLoader";

export default function LoadingShowcase() {
  const [showAudioLoading, setShowAudioLoading] = useState(false);
  const [showProgressRestoration, setShowProgressRestoration] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const handleAudioLoadingDemo = () => {
    setShowAudioLoading(true);
    setAudioError(false);
    
    // Simuler le chargement
    setTimeout(() => {
      setShowAudioLoading(false);
    }, 5000);
  };

  const handleAudioErrorDemo = () => {
    setShowAudioLoading(true);
    setAudioError(false);
    
    // Simuler une erreur après 2 secondes
    setTimeout(() => {
      setAudioError(true);
      setShowAudioLoading(false);
    }, 2000);
  };

  const handleProgressRestorationDemo = () => {
    setShowProgressRestoration(true);
    
    // Simuler la restauration
    setTimeout(() => {
      setShowProgressRestoration(false);
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 h-44 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Améliorations du Système de Chargement
        </h1>
        <p className="text-gray-600">
          Démonstration des nouveaux composants de chargement optimisés
        </p>
      </div>

      {/* Loading Spinners */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Loading Spinners</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <LoadingSpinner size="sm" color="blue" />
            <p className="text-sm text-gray-600 mt-2">Petit - Bleu</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size="md" color="green" />
            <p className="text-sm text-gray-600 mt-2">Moyen - Vert</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size="lg" color="red" />
            <p className="text-sm text-gray-600 mt-2">Grand - Rouge</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size="xl" color="yellow" />
            <p className="text-sm text-gray-600 mt-2">Très grand - Jaune</p>
          </div>
        </div>
      </div>

      {/* Loading avec progression */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Loading avec Progression</h2>
        <div className="space-y-4">
          <LoadingSpinner
            size="lg"
            color="blue"
            text="Chargement avec progression..."
            showProgress={true}
            progress={75}
            className="gap-4"
          />
        </div>
      </div>

      {/* États de chargement audio */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">États de Chargement Audio</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={handleAudioLoadingDemo}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Démarrer Chargement
            </button>
            <button
              onClick={handleAudioErrorDemo}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Simuler Erreur
            </button>
          </div>
          
          <div className="relative h-20 bg-gray-100 rounded-lg overflow-hidden">
            <AudioLoadingState
              isLoading={showAudioLoading}
              audioError={audioError}
            />
          </div>
        </div>
      </div>

      {/* Restauration de progression */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Restauration de Progression</h2>
        <div className="space-y-4">
          <button
            onClick={handleProgressRestorationDemo}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Démarrer Restauration
          </button>
          
          <ProgressRestorationLoader isRestoring={showProgressRestoration} />
        </div>
      </div>

      {/* Skeleton Loaders */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Skeleton Loaders</h2>
        <LoadingSkeleton count={3} />
      </div>

      {/* Lazy Loading */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Lazy Loading</h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            Faites défiler vers le bas pour voir le lazy loading en action :
          </p>
          
          {/* Espace pour forcer le scroll */}
          <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Espace pour démonstration du scroll</p>
          </div>
          
          <LazyVerseLoader skeletonCount={2}>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Contenu Lazy Loadé</h3>
              <p className="text-green-700">
                Ce contenu a été chargé de manière paresseuse lorsque vous avez fait défiler jusqu'ici !
              </p>
            </div>
          </LazyVerseLoader>
        </div>
      </div>

      {/* Résumé des améliorations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">
          Résumé des Améliorations
        </h2>
        <ul className="space-y-2 text-blue-700">
          <li>✅ Spinners réutilisables avec animations fluides</li>
          <li>✅ Barres de progression avec pourcentages</li>
          <li>✅ États de chargement audio améliorés</li>
          <li>✅ Loader de restauration de progression</li>
          <li>✅ Skeleton loaders pour les versets</li>
          <li>✅ Lazy loading optimisé</li>
          <li>✅ Transitions et micro-interactions</li>
          <li>✅ Gestion d'erreurs améliorée</li>
        </ul>
      </div>
    </div>
  );
}
