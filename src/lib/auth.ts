import { getRedirectResult, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {

    console.log("Démarrage de l'authentification Google...");
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    throw error;
  }
};

export const handleRedirectResult = async () => {
  try {
    console.log("Vérification du résultat de redirection...");
    const result = await getRedirectResult(auth);
    console.log("Résultat de redirection:", result);

    if (result) {
      const user = result.user;
      console.log("Email de l'utilisateur:", user.email);
      console.log("Email admin attendu:", process.env.NEXT_PUBLIC_ADMIN_EMAIL);

      if (!process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        throw new Error("NEXT_PUBLIC_ADMIN_EMAIL n'est pas défini");
      }

      if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        console.log("Email non autorisé, déconnexion...");
        await auth.signOut();
        throw new Error("Accès non autorisé");
      }

      console.log("Authentification réussie pour l'administrateur");
      return user;
    } else {
      console.log("Pas de résultat de redirection");
      return null;
    }
  } catch (error) {
    console.error("Erreur lors de la redirection:", error);
    throw error;
  }
};

export const signOut = () => auth.signOut();
