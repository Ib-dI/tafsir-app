// app/api/send-notification/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

// Interface pour stocker les documents de token valides
// interface ValidTokenDoc {
//   id: string;
//   token: string;
// }

// Initialisation du SDK Firebase Admin (une seule fois)
if (getApps().length === 0) {
  try {
    // Vérification des variables d'environnement requises
    const requiredEnvVars = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
    };

    // Vérifier que toutes les variables d'environnement sont définies
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        throw new Error(`Variable d'environnement manquante: FIREBASE_${key.toUpperCase()}`);
      }
    }

    const serviceAccount: ServiceAccount = {
      projectId: requiredEnvVars.project_id,
      privateKey: requiredEnvVars?.private_key?.replace(/\\n/g, '\n'),
      clientEmail: requiredEnvVars.client_email,
    };

    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin initialisé');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin:', error);
    throw error; // Re-throw pour éviter une initialisation partielle
  }
}

export async function POST(request: NextRequest) {
  try {
    const { audioTitle, timestamp } = await request.json();

    if (!audioTitle) {
      return NextResponse.json({ 
        success: false, 
        error: 'Le titre audio est requis' 
      }, { status: 400 });
    }

    console.log('📤 Traitement envoi notification pour:', audioTitle);

    const db = getFirestore();
    const tokensSnapshot = await db.collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
      console.log('⚠️ Aucun token FCM trouvé');
      return NextResponse.json({
        success: true,
        message: 'Aucun destinataire trouvé',
        response: { successCount: 0, totalTokens: 0, failureCount: 0 }
      });
    }

    const tokens: string[] = [];
    const tokenDocMap = new Map<string, string>(); // Utilisation d'une Map pour un meilleur suivi

    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token && typeof data.token === 'string') {
        tokens.push(data.token);
        tokenDocMap.set(data.token, doc.id); // Stocke le token et l'ID du document
      }
    });

    console.log(`📋 ${tokens.length} tokens trouvés`);

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun token valide trouvé',
        response: { successCount: 0, totalTokens: 0, failureCount: 0 }
      });
    }

    const message = {
      notification: {
        title: '🔔 Nouveau contenu disponible',
        body: `${audioTitle} vient d'être ajouté`,
        icon: '/fingerprint.webp',
      },
      data: {
        audioTitle: audioTitle,
        url: '/',
        timestamp: (timestamp || Date.now()).toString(),
        type: 'new_audio'
      },
      webpush: {
        headers: {
          'TTL': '86400',
        },
        notification: {
          icon: '/fingerprint.webp',
          badge: '/fingerprint.webp',
          tag: 'tafsir-notification',
          requireInteraction: true,
        }
      }
    };

    const messaging = getMessaging();
    const batchSize = 500;
    const results = {
      successCount: 0,
      failureCount: 0,
      totalTokens: tokens.length,
      invalidTokens: [] as string[]
    };

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      try {
        console.log(`📨 Envoi batch ${Math.floor(i / batchSize) + 1} - ${batch.length} tokens`);
        
        const response = await messaging.sendEachForMulticast({
          tokens: batch,
          ...message
        });

        results.successCount += response.successCount;
        results.failureCount += response.failureCount;

        response.responses.forEach((result, index) => {
          if (!result.success) {
            const error = result.error;
            const token = batch[index];
            
            if (error?.code === 'messaging/registration-token-not-registered' ||
                error?.code === 'messaging/invalid-registration-token') {
              results.invalidTokens.push(token);
            }
          }
        });

      } catch (batchError) {
        console.error(`❌ Erreur batch ${Math.floor(i / batchSize) + 1}:`, batchError);
        results.failureCount += batch.length;
      }
    }

    if (results.invalidTokens.length > 0) {
      console.log(`🧹 Nettoyage de ${results.invalidTokens.length} tokens invalides...`);
      
      const deletePromises = results.invalidTokens.map(invalidToken => {
        const docId = tokenDocMap.get(invalidToken);
        if (docId) {
          return db.collection('fcmTokens').doc(docId).delete();
        }
        return Promise.resolve();
      });
      
      try {
        await Promise.all(deletePromises);
        console.log('✅ Tokens invalides supprimés');
      } catch (deleteError) {
        console.error('⚠️ Erreur lors de la suppression des tokens invalides:', deleteError);
      }
    }

    console.log(`🎉 Envoi terminé: ${results.successCount}/${results.totalTokens} succès`);

    return NextResponse.json({
      success: true,
      message: `Notification envoyée à ${results.successCount} destinataires`,
      response: {
        successCount: results.successCount,
        failureCount: results.failureCount,
        totalTokens: results.totalTokens,
        invalidTokensRemoved: results.invalidTokens.length
      }
    });

  } catch (error) {
    console.error('💥 Erreur lors de l\'envoi des notifications:', error);
    
    return NextResponse.json({
      success: false,
      error: `Erreur serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}