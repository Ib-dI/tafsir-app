/**
 * Utilitaires pour la gestion optimisée du chargement
 */

// Types pour les états de chargement
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableProgressiveLoading?: boolean;
}

// Configuration par défaut
export const DEFAULT_LOADING_CONFIG: Required<LoadingConfig> = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableProgressiveLoading: true
};

/**
 * Fonction pour créer un délai avec annulation
 */
export function createCancellableDelay(ms: number): Promise<void> & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout;
  
  const promise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, ms);
  });

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return Object.assign(promise, { cancel });
}

/**
 * Fonction pour retry avec backoff exponentiel
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === attempts - 1) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Fonction pour créer une progression fluide
 */
export function createSmoothProgress(
  duration: number,
  onUpdate: (progress: number) => void,
  easing: 'linear' | 'easeInOut' | 'easeOut' = 'easeOut'
): Promise<void> & { cancel: () => void } {
  let animationId: number;
  let startTime: number;

  const easeFunctions = {
    linear: (t: number) => t,
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3)
  };

  const ease = easeFunctions[easing];

  const promise = new Promise<void>((resolve) => {
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = ease(progress);
      
      onUpdate(easedProgress * 100);
      
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    startTime = 0;
    animationId = requestAnimationFrame(animate);
  });

  const cancel = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };

  return Object.assign(promise, { cancel });
}

/**
 * Fonction pour précharger des ressources
 */
export function preloadResource(url: string, type: 'audio' | 'image' | 'video' = 'audio'): Promise<void> {
  return new Promise((resolve, reject) => {
    let element: HTMLMediaElement | HTMLImageElement;

    switch (type) {
      case 'audio':
      case 'video':
        element = type === 'audio' ? new Audio() : document.createElement('video');
        element.preload = 'auto';
        break;
      case 'image':
        element = new Image();
        break;
      default:
        reject(new Error(`Type de ressource non supporté: ${type}`));
        return;
    }

    const handleLoad = () => {
      element.removeEventListener('canplaythrough', handleLoad);
      element.removeEventListener('load', handleLoad);
      element.removeEventListener('error', handleError);
      resolve();
    };

    const handleError = () => {
      element.removeEventListener('canplaythrough', handleLoad);
      element.removeEventListener('load', handleLoad);
      element.removeEventListener('error', handleError);
      reject(new Error(`Erreur lors du préchargement de ${url}`));
    };

    if (type === 'audio' || type === 'video') {
      element.addEventListener('canplaythrough', handleLoad);
    } else {
      element.addEventListener('load', handleLoad);
    }
    
    element.addEventListener('error', handleError);
    element.src = url;

    if (type === 'audio' || type === 'video') {
      (element as HTMLMediaElement).load();
    }
  });
}

/**
 * Type pour NetworkInformation (non inclus par défaut dans TypeScript)
 */
type NetworkInformation = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

/**
 * Fonction pour détecter la vitesse de connexion
 */
export function getConnectionSpeed(): 'slow' | 'medium' | 'fast' {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'medium'; // Par défaut
  }

  const connection = navigator.connection as NetworkInformation | undefined;

  if (!connection || typeof connection.effectiveType !== 'string') return 'medium';

  const effectiveType = connection.effectiveType;

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow';
    case '3g':
      return 'medium';
    case '4g':
      return 'fast';
    default:
      return 'medium';
  }
}

/**
 * Fonction pour adapter la stratégie de chargement selon la connexion
 */
export function getAdaptiveLoadingConfig(): LoadingConfig {
  const speed = getConnectionSpeed();
  
  switch (speed) {
    case 'slow':
      return {
        timeout: 60000, // 1 minute
        retryAttempts: 2,
        retryDelay: 2000,
        enableProgressiveLoading: false
      };
    case 'medium':
      return DEFAULT_LOADING_CONFIG;
    case 'fast':
      return {
        timeout: 15000, // 15 secondes
        retryAttempts: 1,
        retryDelay: 500,
        enableProgressiveLoading: true
      };
    default:
      return DEFAULT_LOADING_CONFIG;
  }
}
