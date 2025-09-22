import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, List, Check, X } from 'lucide-react';

// Types pour les données audio
type TafsirAudioTiming = {
  id: number;
  startTime: number;
  endTime: number;
  occurrence?: number;
};

type TafsirAudioPart = {
  id: string;
  title: string;
  url: string;
  timings: TafsirAudioTiming[];
};

interface HeaderRightProps {
  audioParts: TafsirAudioPart[];
  currentPartIndex: number;
  setCurrentPartIndex: (index: number) => void;
  completedPartIds: Set<string>;
  colors: {
    card: string;
    border: string;
    text: string;
    primary: string;
    textSecondary: string;
    success?: string;
  };
}

const HeaderRight: React.FC<HeaderRightProps> = ({ 
  audioParts, 
  currentPartIndex, 
  setCurrentPartIndex, 
  completedPartIds,
  colors 
}) => {
  const [isPartSelectorVisible, setIsPartSelectorVisible] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Déterminer si la partie actuelle est complétée
  const currentPart = audioParts[currentPartIndex];
  const isCurrentPartCompleted = currentPart && completedPartIds.has(currentPart.id);

  // Empêcher le défilement du body lorsque la modal est ouverte
  useEffect(() => {
    if (isPartSelectorVisible) {
      document.body.style.overflow = 'hidden';
      
      // Scroll vers la partie sélectionnée après un délai pour laisser la modal s'ouvrir
      setTimeout(() => {
        const currentButton = document.querySelector(`[data-part-index="${currentPartIndex}"]`);
        if (currentButton && scrollContainerRef.current) {
          currentButton.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isPartSelectorVisible, currentPartIndex]);

  return (
    <>
      {audioParts && audioParts.length > 1 ? (
        <div className="flex flex-row items-center gap-2">
          <button
            onClick={() => setCurrentPartIndex(Math.max(0, currentPartIndex - 1))}
            className="px-2.5 py-1.5 rounded-full border transition-all duration-200 hover:shadow-sm active:scale-95"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}
            disabled={currentPartIndex === 0}
          >
            <ArrowLeft size={16} color={currentPartIndex === 0 ? colors.textSecondary : colors.text} />
          </button>
          
          <button
            onClick={() => setIsPartSelectorVisible(true)}
            className={`px-2.5 py-1.5 rounded-full flex flex-row items-center gap-1.5 border relative transition-all duration-200 hover:shadow-sm active:scale-95 ${
              isCurrentPartCompleted 
                ? 'bg-green-100/50 text-green-600 border-green-300' 
                : ''
            }`}
            style={{
              backgroundColor: isCurrentPartCompleted ? '' : colors.card,
              borderColor: isCurrentPartCompleted ? '' : colors.border,
              color: isCurrentPartCompleted ? '' : colors.text
            }}
            aria-label="Choisir la partie"
          >
            {/* Icône de validation si la partie est complétée */}
            {isCurrentPartCompleted && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 border border-green-300 shadow-sm">
                <Check size={10} className="text-green-600" />
              </div>
            )}
            
            <List size={16} className={isCurrentPartCompleted ? 'text-green-600' : ''} />
            <span className={`text-xs font-mono ${isCurrentPartCompleted ? 'text-green-600' : ''}`}>
              {currentPartIndex + 1}/{audioParts.length}
            </span>
          </button>
          
          <button
            onClick={() => setCurrentPartIndex(Math.min(audioParts.length - 1, currentPartIndex + 1))}
            className="px-2.5 py-1.5 rounded-full border transition-all duration-200 hover:shadow-sm active:scale-95"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}
            disabled={currentPartIndex === audioParts.length - 1}
          >
            <ArrowRight size={16} color={currentPartIndex === audioParts.length - 1 ? colors.textSecondary : colors.text} />
          </button>
        </div>
      ) : null}
      
      {/* Modal de sélection des parties - Version améliorée */}
      {isPartSelectorVisible && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setIsPartSelectorVisible(false)}
        >
          {/* Overlay avec animation de fade */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] animate-in fade-in duration-200" />
          
          {/* Conteneur de la modal avec animations */}
          <div 
            className="relative bg-white rounded-t-3xl shadow-xl w-full max-w-lg mx-1 mb-0 overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out flex flex-col"
            style={{ maxHeight: '70vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* En-tête fixe avec design amélioré */}
            <div className="relative px-6 pt-4 pb-3 bg-white border-b border-gray-100 shrink-0">
              {/* Poignée de drag centrée et stylisée */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-1 rounded-full bg-gray-300" />
              </div>
              
              {/* Conteneur du titre et croix */}
              <div className="flex items-center justify-between pt-2">
                <div className="w-8" /> {/* Spacer pour centrer le titre */}
                
                <h3 className="font-semibold text-lg text-gray-800 text-center">
                  Choisir la partie
                </h3>
                
                {/* Croix de fermeture bien positionnée */}
                <button
                  onClick={() => setIsPartSelectorVisible(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center active:scale-95"
                  aria-label="Fermer"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Liste des parties avec défilement interne et design amélioré */}
            <div 
              ref={scrollContainerRef}
              className="overflow-y-auto flex-1 bg-gray-50/30 min-h-0"
            >
              {audioParts.map((part, idx) => {
                // Compter les versets uniques et les occurrences multiples
                const uniqueVerses = new Set(part.timings.map(t => t.id));
                const totalOccurrences = part.timings.length;
                const hasMultipleOccurrences = totalOccurrences > uniqueVerses.size;
                const isCompleted = completedPartIds.has(part.id);
                const isCurrentPart = idx === currentPartIndex;
                
                return (
                  <button
                    key={part && part.id ? String(part.id) : String(idx)}
                    data-part-index={idx}
                    onClick={() => {
                      setCurrentPartIndex(idx);
                      setIsPartSelectorVisible(false);
                    }}
                    className={`w-full py-4 px-6 flex flex-row items-center transition-all duration-200 ${
                      isCurrentPart 
                        ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                        : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'
                    } ${idx !== audioParts.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    {/* Numéro de partie avec design amélioré */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isCurrentPart 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </div>
                    
                    {/* Contenu principal */}
                    <div className="flex-1 ml-4 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${
                          isCurrentPart ? 'text-blue-700' : 'text-gray-800'
                        }`}>
                          {part.id === "remaining-verses" ? (
                            <>
                              {part.title} ({part.timings.length})
                            </>
                          ) : (
                            part.title || `Partie ${idx + 1}`
                          )}
                        </span>
                        
                        {/* Badge pour les occurrences multiples */}
                        {hasMultipleOccurrences && part.id !== "remaining-verses" && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
                            +occurrences
                          </span>
                        )}
                      </div>
                      
                      {/* Badge sans audio */}
                      {part.id === "remaining-verses" && (
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full font-medium">
                          sans audio
                        </span>
                      )}
                    </div>
                    
                    {/* Icônes de statut avec design amélioré */}
                    <div className="flex items-center gap-3">
                      {isCompleted && part.id !== "remaining-verses" && (
                        <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center">
                          <Check size={12} className="text-green-600" strokeWidth={2.5} />
                        </div>
                      )}
                      
                      {isCurrentPart && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderRight;