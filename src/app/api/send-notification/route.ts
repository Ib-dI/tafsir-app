// app/api/send-notification/route.ts
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore'; // Pour récupérer les tokens
import { NextResponse } from 'next/server';
// Importez le module 'fs' de Node.js
import * as fs from 'fs';
// Importez le module 'path' de Node.js pour la résolution des chemins
import * as path from 'path';

// Initialisation du SDK Admin Firebase
let adminApp: admin.app.App | null = null;
try {
  if (!admin.apps.length) {
    const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      // Utilisez une erreur plus explicite pour le débogage si besoin
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH not set in environment variables or path is invalid.');
    }

    // Résoudre le chemin absolu du fichier de clé de compte de service
    // __dirname pointe vers le répertoire du fichier en cours
    const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

    // Lire le fichier JSON de manière synchrone
    const serviceAccountContent = fs.readFileSync(absolutePath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountContent);

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'tafsir-app-3b154', // Votre ID de projet
    });
  } else {
    adminApp = admin.app();
  }
} catch (error) {
  console.error("Erreur lors de l'initialisation de Firebase Admin:", error);
  // Gérez l'erreur d'initialisation de manière appropriée
}

export async function POST(request: Request) {
  if (!adminApp) {
    return NextResponse.json({ message: 'Firebase Admin not initialized' }, { status: 500 });
  }

  // **** IMPORTANT : Implémentez ici votre logique d'authentification/autorisation ****
  // Seuls les utilisateurs ou systèmes autorisés devraient pouvoir envoyer des notifications.
  // Par exemple, vérifier un token d'authentification d'admin, ou restreindre l'accès IP.
  // Sans cela, n'importe qui pourrait appeler cette route.
  // ***********************************************************************************

  const { audioTitle, audioUrl } = await request.json();

  if (!audioTitle || !audioUrl) {
    return NextResponse.json({ message: 'Missing audioTitle or audioUrl' }, { status: 400 });
  }

  try {
    const firestore = getFirestore(adminApp);

    // Récupérer les tokens FCM actifs des utilisateurs
    const tokensSnapshot = await firestore.collection('fcmTokens')
      .where('active', '==', true)
      .where('lastUsed', '>', Date.now() - (30 * 24 * 60 * 60 * 1000)) // Tokens utilisés dans les 30 derniers jours
      .get();

    const registrationTokens: string[] = [];
    const invalidTokens: string[] = [];

    tokensSnapshot.forEach((doc) => {
      const tokenData = doc.data();
      if (tokenData.token && typeof tokenData.token === 'string') {
        registrationTokens.push(tokenData.token);
      } else {
        invalidTokens.push(doc.id);
      }
    });

    // Nettoyer les tokens invalides
    if (invalidTokens.length > 0) {
      const batch = firestore.batch();
      invalidTokens.forEach((tokenId) => {
        batch.delete(firestore.collection('fcmTokens').doc(tokenId));
      });
      await batch.commit();
    }

    if (registrationTokens.length === 0) {
      return NextResponse.json({ 
        message: 'Aucun token FCM actif trouvé',
        invalidTokensRemoved: invalidTokens.length 
      }, { status: 200 });
    }

    const message = {
      notification: {
        title: `Nouvel Audio : ${audioTitle}`,
        body: 'Un nouveau tafsir est disponible ! Cliquez pour l\'écouter.',
      },
      webpush: {
        notification: {
          title: `Nouvel Audio : ${audioTitle}`,
          body: 'Un nouveau tafsir est disponible ! Cliquez pour l\'écouter.',
          icon: '/bismillah.png', // Icône de la notification
          badge: '/fingerprint.webp', // Badge pour les notifications Android
          vibrate: [100, 50, 100], // Pattern de vibration
          actions: [
            {
              action: 'listen',
              title: 'Écouter maintenant'
            }
          ]
        },
        fcm_options: {
          link: audioUrl,
        },
        headers: {
          Urgency: 'high',
        },
      },
      data: {
        type: 'new_audio',
        audioTitle,
        audioUrl,
        timestamp: Date.now().toString(),
      },
    };

    // Envoyer le message à tous les tokens
    const response = await admin.messaging().sendEachForMulticast({
      tokens: registrationTokens,
      ...message,
    });

    // Gérer les tokens invalides ou expirés
    const failedTokens = response.responses.map((res, idx) => {
      if (!res.success) {
        return {
          token: registrationTokens[idx],
          error: res.error?.message
        };
      }
      return null;
    }).filter(Boolean);

    // Supprimer les tokens invalides
    if (failedTokens.length > 0) {
      const batch = firestore.batch();
      failedTokens.forEach((failedToken: any) => {
        const tokenDoc = firestore.collection('fcmTokens').doc(failedToken.token);
        batch.delete(tokenDoc);
      });
      await batch.commit();
    }

    const result = {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens: failedTokens,
      totalTokens: registrationTokens.length
    };

    console.log('Résultat de l\'envoi des notifications:', result);

    // Gérer les tokens invalides ou expirés (optionnel mais recommandé)
    if (response.responses) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (resp.success === false && (resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered')) {
          tokensToRemove.push(registrationTokens[idx]);
          console.warn(`Invalid or expired token: ${registrationTokens[idx]}`);
          // Supprimer le token de Firestore
          firestore.collection('fcmTokens').doc(registrationTokens[idx]).delete()
            .then(() => console.log(`Token ${registrationTokens[idx]} removed from Firestore.`))
            .catch(err => console.error(`Error removing token ${registrationTokens[idx]}:`, err));
        }
      });
    }

    return NextResponse.json({ success: true, results: response.responses });

  } catch (error) {
    console.error('Error sending notification:', error);
    
    // Correction du typage de l'erreur
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json({ 
      message: 'Failed to send notification', 
      error: errorMessage 
    }, { status: 500 });
  }
}