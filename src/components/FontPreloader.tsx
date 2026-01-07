/**
 * FontPreloader optimisé - Ne précharge que les polices critiques
 * Les polices TTF lourdes sont chargées à la demande via font-display: swap
 * 
 * Optimisations:
 * - Précharge uniquement Uthmanic (woff2, la plus légère et la plus utilisée)
 * - Les autres polices se chargent à la demande pour ne pas bloquer le rendu
 * - Utilise font-display: swap dans globals.css pour un rendu fluide
 */

const DEFAULT_LOCALE = 'fr';

// Seulement la police la plus critique et la plus légère (woff2)
// Les polices TTF sont lourdes et ralentissent le chargement initial
const CRITICAL_FONTS = {
  [DEFAULT_LOCALE]: [
    { type: 'font/woff2', location: '/fonts/UthmanicHafs1Ver18.woff2' },
  ],
} as const;

interface FontPreloaderProps {
  locale?: string;
}

/**
 * Composant FontPreloader optimisé pour précharger uniquement les polices critiques
 * Les autres polices se chargent à la demande via font-display: swap
 */
const FontPreloader: React.FC<FontPreloaderProps> = ({ locale = DEFAULT_LOCALE }) => {
  const toBePreLoadedFonts = CRITICAL_FONTS[locale] || CRITICAL_FONTS[DEFAULT_LOCALE];

  return (
    <>
      {toBePreLoadedFonts.map((fontDetails) => (
        <link
          key={fontDetails.location}
          rel="preload"
          as="font"
          type={fontDetails.type}
          href={fontDetails.location}
          crossOrigin="anonymous"
        />
      ))}
    </>
  );
};

export default FontPreloader;

