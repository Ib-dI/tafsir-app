// // src/lib/notifications.ts
// import { doc, setDoc } from "firebase/firestore";
// import { getMessaging, getToken, isSupported } from "firebase/messaging";
// import { db } from "./firebase";

// export const testFirebaseConfig = async (): Promise<void> => {
//   console.log("=== DIAGNOSTIC FIREBASE ===");

//   const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
//   console.log("VAPID Key présente:", !!vapidKey);
//   console.log("VAPID Key valide:", vapidKey?.startsWith("B") ? "OUI" : "NON");
//   console.log("Longueur VAPID:", vapidKey?.length);

//   try {
//     const supported = await isSupported();
//     console.log("Messaging supporté:", supported);
//   } catch (error) {
//     console.error("Erreur support:", error);
//   }

//   if ("serviceWorker" in navigator) {
//     const registrations = await navigator.serviceWorker.getRegistrations();
//     console.log("Nombre de SW:", registrations.length);
//     registrations.forEach((reg, idx) => {
//       console.log(`SW ${idx + 1}:`, reg.scope, reg.active?.state);
//     });
//   }

//   console.log("Permission:", Notification.permission);
//   console.log("URL actuelle:", window.location.href);
//   console.log("Protocol:", window.location.protocol);
//   console.log("=== FIN DIAGNOSTIC ===");
// };

// // Fonction pour initialiser le service worker avec timeout
// const initializeServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
//   if (!('serviceWorker' in navigator)) {
//     throw new Error('Service Workers non supportés');
//   }

//   try {
//     // Enregistrer le service worker s'il n'existe pas
//     let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
//     if (!registration) {
//       console.log('📝 Enregistrement du service worker...');
//       registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
//         scope: '/'
//       });
//       console.log('✅ Service worker enregistré');
//     }

//     // Attendre qu'il soit prêt avec timeout
//     const timeoutPromise = new Promise<never>((_, reject) => {
//       setTimeout(() => reject(new Error('Timeout: Service Worker non prêt')), 10000);
//     });

//     const readyPromise = navigator.serviceWorker.ready;
    
//     await Promise.race([readyPromise, timeoutPromise]);
//     console.log('✅ Service Worker prêt');

//     return registration;
//   } catch (error) {
//     console.error('❌ Erreur initialisation SW:', error);
//     throw error;
//   }
// };

// // Fonction pour vérifier et demander les permissions
// const ensureNotificationPermission = async (): Promise<boolean> => {
//   if (!('Notification' in window)) {
//     throw new Error('Notifications non supportées');
//   }

//   let permission = Notification.permission;
  
//   if (permission === 'default') {
//     console.log('⚠️ Demande de permission de notification...');
//     permission = await Notification.requestPermission();
//   }

//   if (permission === 'granted') {
//     console.log('✅ Permission de notification accordée');
//     return true;
//   } else {
//     console.log('❌ Permission de notification refusée:', permission);
//     return false;
//   }
// };

// export const saveMessagingToken = async (
//   anonymousUserId: string,
//   vapidKey: string,
// ): Promise<void> => {
//   console.log("🚀 Démarrage saveMessagingToken pour:", anonymousUserId);

//   try {
//     // Vérifications préliminaires
//     if (!vapidKey) {
//       throw new Error("VAPID key manquante - vérifiez NEXT_PUBLIC_FIREBASE_VAPID_KEY");
//     }

//     if (!vapidKey.startsWith("B")) {
//       throw new Error("VAPID key invalide - doit commencer par 'B'");
//     }

//     console.log("✅ VAPID key valide:", vapidKey.substring(0, 20) + "...");

//     // Vérifier le support des technologies nécessaires
//     const isMessagingSupported = await isSupported();
//     if (!isMessagingSupported) {
//       throw new Error("Firebase Messaging n'est pas supporté dans cet environnement");
//     }

//     // Vérifier les permissions de notification
//     const hasPermission = await ensureNotificationPermission();
//     if (!hasPermission) {
//       throw new Error("Permission de notification requise");
//     }

//     // Initialiser le service worker
//     await initializeServiceWorker();

//     // Obtenir l'instance messaging
//     const messaging = getMessaging();
//     console.log("✅ Instance messaging obtenue");

//     // Obtenir le token avec retry amélioré
//     let token: string | null = null;
//     const maxRetries = 3;
    
//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//       try {
//         console.log(`🔑 Tentative ${attempt}/${maxRetries} d'obtention du token...`);
        
//         // Ajouter un délai progressif entre les tentatives
//         if (attempt > 1) {
//           const delay = 1000 * Math.pow(2, attempt - 2); // 1s, 2s, 4s
//           console.log(`⏳ Attente de ${delay}ms avant retry...`);
//           await new Promise(resolve => setTimeout(resolve, delay));
//         }
        
//         token = await getToken(messaging, {
//           vapidKey: vapidKey,
//         });
        
//         if (token) {
//           console.log("✅ Token FCM obtenu:", token.substring(0, 50) + "...");
//           break;
//         } else {
//           console.log("⚠️ Aucun token obtenu (tentative", attempt + ")");
          
//           if (attempt === maxRetries) {
//             throw new Error("Impossible d'obtenir le token FCM après plusieurs tentatives");
//           }
//         }
//       } catch (error) {
//         console.error(`❌ Tentative ${attempt} échouée:`, error);
        
//         // Diagnostic spécifique pour certaines erreurs
//         if (error instanceof Error) {
//           if (error.message.includes('messaging/token-subscribe-failed')) {
//             console.log("💡 Erreur d'abonnement - vérifiez la clé VAPID et la configuration Firebase");
//           } else if (error.message.includes('messaging/permission-blocked')) {
//             console.log("💡 Permissions bloquées - demandez à l'utilisateur d'autoriser les notifications");
//           } else if (error.message.includes('messaging/unsupported-browser')) {
//             console.log("💡 Navigateur non supporté pour les notifications push");
//           }
//         }
        
//         if (attempt === maxRetries) {
//           throw error;
//         }
//       }
//     }

//     if (token) {
//       // Sauvegarder le token dans Firestore avec plus de métadonnées
//       const tokenDocRef = doc(db, "fcmTokens", anonymousUserId);
//       await setDoc(
//         tokenDocRef,
//         {
//           token,
//           userId: anonymousUserId,
//           timestamp: new Date(),
//           userAgent: navigator.userAgent,
//           url: window.location.href,
//           platform: navigator.platform,
//           language: navigator.language,
//           lastActive: new Date(), // Pour nettoyer les tokens inactifs
//         },
//         { merge: true }
//       );

//       console.log("💾 Token sauvegardé dans Firestore avec métadonnées");
      
//       // Test optionnel du token
//       await testTokenValidity(token);
//     } else {
//       throw new Error("Token FCM null après toutes les tentatives");
//     }

//   } catch (error) {
//     console.error("❌ Erreur saveMessagingToken:", error);
    
//     // Diagnostic supplémentaire en cas d'erreur
//     if (error instanceof Error) {
//       if (error.message.includes('Registration failed')) {
//         console.log("💡 Suggestions pour 'Registration failed':");
//         console.log("   - Vérifiez que firebase-messaging-sw.js existe à la racine du domaine");
//         console.log("   - Vérifiez la clé VAPID dans Firebase Console > Project Settings > Cloud Messaging");
//         console.log("   - Essayez de vider le cache du navigateur et les données du site");
//         console.log("   - Vérifiez que le domaine est autorisé dans Firebase Console");
//       }
      
//       if (error.message.includes('permission')) {
//         console.log("💡 Problème de permissions - l'utilisateur doit autoriser les notifications");
//       }
//     }
    
//     throw error;
//   }
// };

// // Nouvelle fonction pour tester la validité du token
// const testTokenValidity = async (token: string): Promise<boolean> => {
//   try {
//     console.log("🧪 Test de validité du token...");
    
//     // Faire un appel test à l'API
//     const response = await fetch('/api/test-token', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ token })
//     });
    
//     if (response.ok) {
//       console.log("✅ Token valide");
//       return true;
//     } else {
//       console.log("⚠️ Token potentiellement invalide");
//       return false;
//     }
//   } catch (error) {
//     console.log("⚠️ Impossible de tester le token:", error);
//     return false;
//   }
// };

// // Fonction pour envoyer une notification manuelle (améliorée)
// export const sendManualNotification = async (audioTitle: string): Promise<boolean> => {
//   try {
//     console.log("📤 Envoi notification pour:", audioTitle);
    
//     const apiUrl = '/api/send-notification';
//     console.log("📡 Appel API:", apiUrl);
    
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 30000); // Timeout 30s
    
//     const response = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ 
//         audioTitle: audioTitle,
//         timestamp: Date.now() // Pour le debugging
//       }),
//       signal: controller.signal
//     });

//     clearTimeout(timeoutId);
    
//     console.log("📈 Statut réponse:", response.status, response.statusText);

//     if (!response.ok) {
//       let errorMessage = `Erreur HTTP ${response.status}`;
//       try {
//         const errorData = await response.text();
//         console.error("❌ Détails erreur:", errorData);
//         errorMessage += `: ${errorData}`;
//       } catch (e) {
//         console.error("❌ Impossible de lire l'erreur:", e);
//       }
//       throw new Error(errorMessage);
//     }

//     const result = await response.json();
//     console.log("✅ Résultat:", result);

//     if (result.success) {
//       const successCount = result.response?.successCount || 0;
//       const totalCount = result.response?.totalTokens || result.totalTokens || 0;
//       const failureCount = result.response?.failureCount || 0;
      
//       console.log(`🎉 Notification envoyée: ${successCount}/${totalCount} succès`);
//       if (failureCount > 0) {
//         console.log(`⚠️ ${failureCount} échecs détectés`);
//       }
      
//       return true;
//     } else {
//       throw new Error(result.error || "Erreur inconnue lors de l'envoi");
//     }

//   } catch (error) {
//     console.error("💥 Erreur lors de l'envoi de la notification:", error);
    
//     // Gestion d'erreurs spécifique
//     if (error instanceof DOMException && error.name === 'AbortError') {
//       console.error("🕐 Timeout: l'envoi a pris trop de temps");
//     } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
//       console.error("🚫 Erreur réseau - vérifiez votre connexion Internet");
//     }
    
//     throw error;
//   }
// };

// // Fonction utilitaire pour nettoyer les anciens tokens
// export const cleanupOldTokens = async (anonymousUserId: string): Promise<void> => {
//   try {
//     console.log("🧹 Nettoyage des anciens tokens pour:", anonymousUserId);
    
//     const response = await fetch('/api/cleanup-tokens', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ userId: anonymousUserId })
//     });
    
//     if (response.ok) {
//       console.log("✅ Nettoyage des tokens effectué");
//     }
//   } catch (error) {
//     console.log("⚠️ Erreur lors du nettoyage:", error);
//   }
// };

// // Fonction pour renouveler le token périodiquement
// export const refreshTokenPeriodically = async (
//   anonymousUserId: string,
//   vapidKey: string
// ): Promise<void> => {
//   try {
//     console.log("🔄 Renouvellement périodique du token");
    
//     // Vérifier si le token actuel est encore valide
//     const messaging = getMessaging();
//     const currentToken = await getToken(messaging, { vapidKey });
    
//     if (currentToken) {
//       const isValid = await testTokenValidity(currentToken);
//       if (!isValid) {
//         console.log("♻️ Token invalide, renouvellement nécessaire");
//         await saveMessagingToken(anonymousUserId, vapidKey);
//       } else {
//         console.log("✅ Token actuel toujours valide");
//       }
//     } else {
//       console.log("❌ Aucun token trouvé, génération d'un nouveau");
//       await saveMessagingToken(anonymousUserId, vapidKey);
//     }
//   } catch (error) {
//     console.error("❌ Erreur lors du renouvellement:", error);
//   }
// };

// // Fonctions de debug inchangées mais améliorées
// export const debugServiceWorker = async (): Promise<void> => {
//   console.log("=== DEBUG SERVICE WORKER ===");

//   try {
//     if (!('serviceWorker' in navigator)) {
//       console.log("❌ Service Worker non supporté");
//       return;
//     }

//     const registrations = await navigator.serviceWorker.getRegistrations();
//     console.log("📋 Service Workers enregistrés:", registrations.length);
    
//     registrations.forEach((reg, index) => {
//       console.log(`SW ${index + 1}:`, {
//         scope: reg.scope,
//         state: reg.active?.state,
//         scriptURL: reg.active?.scriptURL,
//         updatefound: reg.addEventListener ? 'disponible' : 'non disponible'
//       });
//     });

//     if (registrations.length > 0) {
//       const registration = await navigator.serviceWorker.ready;
//       console.log("✅ SW ready:", {
//         scope: registration.scope,
//         state: registration.active?.state,
//         installing: !!registration.installing,
//         waiting: !!registration.waiting
//       });
//     }

//     // Test messaging avec diagnostics
//     const messaging = getMessaging();
//     const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

//     if (vapidKey) {
//       console.log("🔑 Test récupération token...");
//       try {
//         const token = await getToken(messaging, { vapidKey });
//         console.log("✅ Token test:", token ? "OBTENU" : "NON OBTENU");
//         if (token) {
//           console.log("Token preview:", token.substring(0, 50) + "...");
          
//           // Test de validité
//           const isValid = await testTokenValidity(token);
//           console.log("Token valide:", isValid ? "OUI" : "INCONNU");
//         }
//       } catch (tokenError) {
//         console.error("❌ Erreur token:", tokenError);
//       }
//     } else {
//       console.error("❌ VAPID key manquante dans l'environnement");
//     }

//   } catch (error) {
//     console.error("❌ Debug error:", error);
//   }
  
//   console.log("=== FIN DEBUG SERVICE WORKER ===");
// };

// // Export des nouvelles fonctions utilitaires
// export {
//   initializeServiceWorker,
//   ensureNotificationPermission,
//   testTokenValidity,
//   cleanupOldTokens,
//   refreshTokenPeriodically
// };