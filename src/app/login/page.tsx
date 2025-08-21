'use client';

import { Button } from "@/components/ui/button";
import { handleRedirectResult, signInWithGoogle } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const checkAuthAndRedirect = async () => {
      try {
        setIsCheckingAuth(true);
        console.log("Vérification de l'authentification...");
        
        // Vérifier si l'utilisateur est déjà connecté
        unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
            console.log("Utilisateur déjà connecté, redirection...");
            router.push('/admin');
            return;
          }
        });

        // Vérifier le résultat de la redirection
        const user = await handleRedirectResult();
        if (user) {
          console.log("Redirection après connexion réussie...");
          router.push('/admin');
        }
      } catch (error: any) {
        console.error("Erreur lors de la vérification:", error);
        setError(error.message || "Une erreur s'est produite lors de la connexion");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndRedirect();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError("");
      await signInWithGoogle();
    } catch (error) {
      setError("Erreur lors de la connexion. Veuillez réessayer.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md">
          <p className="text-center">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Connexion Administrateur</h1>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Connectez-vous avec l'email administrateur autorisé :
          </p>
          <p className="text-xs text-gray-500 mb-4">
            {process.env.NEXT_PUBLIC_ADMIN_EMAIL || "Email admin non configuré"}
          </p>
        </div>
        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Connexion en cours..." : "Se connecter avec Google"}
        </Button>
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
