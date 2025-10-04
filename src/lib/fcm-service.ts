// lib/fcm-service.ts
import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';

// Enregistrer un token FCM
export const saveFCMToken = async (token: string, userId: string) => {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID non défini');
    }

    // Utiliser la même structure que favorites et progress
    const tokenRef = doc(
      db,
      `artifacts/${projectId}/users/${userId}/fcm_tokens`,
      token.substring(0, 20) // Utiliser les 20 premiers caractères comme ID
    );

    await setDoc(tokenRef, {
      token,
      userId,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    });

    console.log('Token FCM enregistré avec succès');
    return tokenRef.id;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
    throw error;
  }
};

// Récupérer tous les tokens de tous les utilisateurs
export const getAllFCMTokens = async (): Promise<string[]> => {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID non défini');
    }

    const tokens: string[] = [];
    
    // Récupérer tous les utilisateurs
    const usersRef = collection(db, `artifacts/${projectId}/users`);
    const usersSnapshot = await getDocs(usersRef);

    // Pour chaque utilisateur, récupérer ses tokens
    for (const userDoc of usersSnapshot.docs) {
      const tokensRef = collection(db, `artifacts/${projectId}/users/${userDoc.id}/fcm_tokens`);
      const tokensSnapshot = await getDocs(tokensRef);
      
      tokensSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.token) {
          tokens.push(data.token);
        }
      });
    }

    console.log(`${tokens.length} tokens récupérés`);
    return tokens;
  } catch (error) {
    console.error('Erreur lors de la récupération des tokens:', error);
    return [];
  }
};

// Supprimer un token
export const deleteFCMToken = async (token: string, userId: string) => {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID non défini');
    }

    const tokenRef = doc(
      db,
      `artifacts/${projectId}/users/${userId}/fcm_tokens`,
      token.substring(0, 20)
    );

    await deleteDoc(tokenRef);
    console.log('Token supprimé:', token.substring(0, 20));
  } catch (error) {
    console.error('Erreur lors de la suppression du token:', error);
    throw error;
  }
};