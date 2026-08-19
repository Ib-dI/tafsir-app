import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  // Toujours `false` au premier rendu (serveur et client) : lire
  // `window.matchMedia` de façon synchrone désynchronise l'hydratation,
  // car le client la voit immédiatement alors que le serveur ne le peut pas.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}