import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    console.log("Démarrage de l'authentification Google...");
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, provider);
    
    const user = result.user;
    
    // Vérification de l'email ici, car le résultat est immédiat
    if (!process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      throw new Error("NEXT_PUBLIC_ADMIN_EMAIL n'est pas défini");
    }

    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      console.log("Email non autorisé, déconnexion...");
      await firebaseSignOut(auth);
      throw new Error("Accès non autorisé");
    }

    console.log("Authentification réussie pour l'administrateur");
    return user;
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    throw error;
  }
};

export const signOut = () => firebaseSignOut(auth);