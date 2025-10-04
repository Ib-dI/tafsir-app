import { motion } from "framer-motion"
import {
  CheckCircle,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import React from "react";

interface SuccessCardProps {
  replayChapter: () => void;
  hasNextChapter: boolean;
  hasPreviousChapter: boolean;
  infoSourate: (number | string)[];
  closeOverlay: () => void;
  goToPreviousChapter: () => void;
  goToNextChapter: () => void;
  isMobile: boolean;
}


const SuccessCard = ({
  replayChapter,
  hasNextChapter,
  hasPreviousChapter,
  infoSourate,
  closeOverlay,
  goToPreviousChapter,
  goToNextChapter,
  isMobile,
}: SuccessCardProps): React.JSX.Element => {
  return (
    <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 z-[900] flex items-center justify-center bg-black/10 p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.2,
                }}
                className="relative flex w-full max-w-md flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-8 shadow-2xl"
              >
                {/* Bouton de fermeture */}
                <button
                  onClick={closeOverlay}
                  className="absolute top-4 right-4 rounded-full p-1 transition-colors hover:bg-green-200"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
    
                {/* Icône de succès */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 150,
                    damping: 15,
                    delay: 0.4,
                  }}
                  className="mb-4 md:mb-6"
                >
                  <CheckCircle
                    className="h-14 w-14 text-green-500 md:h-20 md:w-20"
                    strokeWidth={1.5}
                  />
                </motion.div>
    
                {/* Message de félicitations */}
                <motion.h3
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mb-2 text-center text-2xl font-bold text-gray-800"
                >
                  Chapitre terminé !
                </motion.h3>
    
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="mb-6 text-center text-gray-600"
                >
                  Vous avez complété{" "}
                  <div className="text-gray-800 flex gap-2 shadow-xs items-center bg-green-100 px-2 py-1 rounded-lg">
                    <span className="font-bold">
                      {infoSourate[0]}. {infoSourate[2]}
                    </span>
                    <span
                      className={`font-sura text-xl`}
                      >{`surah${Number(infoSourate[0]) < 10 ? "00" : Number(infoSourate[0]) < 100 ? "0" : ""}${Number(infoSourate[0])}`}
                      </span>
                  </div>
                </motion.p>
    
                {/* Conteneur des boutons d'action */}
                <div className="flex w-full flex-col gap-3">
                  {/* Bouton de rejouer */}
                  <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    onClick={replayChapter}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 font-semibold text-white transition-all hover:bg-green-600 hover:shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Play className="h-5 w-5" fill="currentColor" />
                    Réécouter ce chapitre
                  </motion.button>
    
                  {/* Navigation entre chapitres */}
                  <div className="flex w-full gap-3">
                    {/* Bouton chapitre précédent */}
                    <motion.button
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.2, duration: 0.5 }}
                      onClick={goToPreviousChapter}
                      disabled={!hasPreviousChapter}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 font-medium transition-all ${
                        hasPreviousChapter
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
                    : "cursor-not-allowed bg-gray-200 text-gray-400"
                      }`}
                      whileHover={hasPreviousChapter ? { scale: 1.02 } : {}}
                      whileTap={hasPreviousChapter ? { scale: 0.98 } : {}}
                    >
                      <ChevronLeft className="h-5 w-5" />
                      Précédent
                    </motion.button>
    
                    {/* Bouton chapitre suivant */}
                    <motion.button
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.2, duration: 0.5 }}
                      onClick={goToNextChapter}
                      disabled={!hasNextChapter}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 font-medium transition-all ${
                        hasNextChapter
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40"
                    : "cursor-not-allowed bg-gray-200 text-gray-400"
                      }`}
                      whileHover={hasNextChapter ? { scale: 1.02 } : {}}
                      whileTap={hasNextChapter ? { scale: 0.98 } : {}}
                    >
                      Suivant
                      <ChevronRight className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
    
                {/* Indicateur de progression */}
                {!isMobile && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    className="mt-6 text-center text-xs text-gray-500"
                  >
                    <span className="inline-block px-2 py-0.5 rounded bg-gray-100 font-mono border border-gray-200">Échap</span>
              <span className="ml-2">pour fermer</span>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
  )
}
export default SuccessCard