// app/api/send-notification/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore'; // Pour récupérer les tokens

// Initialisation du SDK Admin Firebase
// Ceci est un exemple simple, en production, utilisez des variables d'environnement
// pour le chemin de votre clé de compte de service et assurez-vous qu'elle est sécurisée.
// La variable d'environnement `GOOGLE_APPLICATION_CREDENTIALS` est la méthode préférée pour Vercel.
let adminApp: admin.app.App | null = null;
try {
  if (!admin.apps.length) {
    const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH not set in environment variables.');
    }
    const serviceAccount = require(serviceAccountPath);

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

    // Récupérer tous les tokens FCM des utilisateurs (ou une sélection)
    // Assurez-vous que votre collection 'fcmTokens' et vos règles Firestore le permettent.
    const tokensSnapshot = await firestore.collection('fcmTokens').get();
    const registrationTokens: string[] = [];
    tokensSnapshot.forEach((doc) => {
      const tokenData = doc.data();
      if (tokenData.token) {
        registrationTokens.push(tokenData.token);
      }
    });

    if (registrationTokens.length === 0) {
      return NextResponse.json({ message: 'No FCM tokens registered' }, { status: 200 });
    }

    const message = {
      notification: {
        title: `Nouvel Audio : ${audioTitle}`,
        body: 'Écoutez le dernier ajout à notre collection d\'audios !',
      },
      webpush: {
        fcm_options: {
          link: audioUrl, // L'URL de la page dédiée à ouvrir au clic
        },
        headers: {
          Urgency: 'high', // Pour une livraison plus rapide
        },
      },
      data: {
        audioId: 'some-unique-audio-id', // ID de l'audio si nécessaire côté client
        type: 'new_audio_alert',
      },
    };

    // Envoyer le message à tous les tokens
    const response = await admin.messaging().sendEachForMulticast({
      tokens: registrationTokens,
      ...message,
    });

    console.log('Messages envoyés avec succès :', response);

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