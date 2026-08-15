import { useRef } from "react";
import { useLongPress } from "@/hooks/useLongPress";

interface UseCompletedPartLongPressOptions {
  /** Appui long détecté — au caller de décider quoi en faire (ouvrir un dialogue, etc). */
  onLongPress: () => void;
  /** Clic normal (sélection) — omis si l'élément n'est pas cliquable (ex: pastille). */
  onSelect?: () => void;
  duration?: number;
}

/**
 * Câblage partagé pour l'affordance "appui long pour réinitialiser une
 * partie complétée" : useLongPress + désambiguïsation clic/appui-long.
 * Ne possède pas le dialogue de confirmation — l'élément qui déclenche
 * l'appui long peut être démonté au même moment (ex: fermeture d'un Select
 * ou d'une modal), donc le dialogue doit vivre chez un ancêtre qui survit.
 */
export function useCompletedPartLongPress({
  onLongPress,
  onSelect,
  duration = 600,
}: UseCompletedPartLongPressOptions) {
  const firedRef = useRef(false);

  const { handlers, pressing, progress } = useLongPress(() => {
    firedRef.current = true;
    onLongPress();
  }, duration);

  const onClick = onSelect
    ? () => {
        if (firedRef.current) {
          firedRef.current = false;
          return;
        }
        onSelect();
      }
    : undefined;

  return { handlers, pressing, progress, onClick };
}
