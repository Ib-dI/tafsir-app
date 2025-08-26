// app/admin/page.tsx
"use client"; // <-- IMPÉRATIF : Indique que ce composant est un Client Component

import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase"; // Assurez-vous que ce chemin est correct
import { useRouter } from "next/navigation"; // Pour la redirection côté client
import { signOut } from "firebase/auth";

import {
  BellRing,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Info,
  MessageSquare,
  Code,
  ShieldAlert,
  LogOut,
} from "lucide-react";

// Type pour les données envoyées à la Cloud Function
interface MultipleUsersNotificationPayload {
  title: string;
  body: string;
  targetUserIds?: string[];
  payloadData?: { [key: string]: string };
}

// Composant pour la page d'administration
const NotificationAdminPage = () => {
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [targetUsersInput, setTargetUsersInput] = useState<string>("");
  const [payloadDataInput, setPayloadDataInput] = useState<string>("{}");

  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [user, authLoading] = useAuthState(auth); // authError n'est pas utilisé directement ici, middleware gère l'accès
  const router = useRouter();

  // Initialisation de la fonction Cloud
  // On s'assure que getFunctions est disponible (peut être undefined lors de certains rendus côté serveur si non dynamique)
  // Même si 'use client' est là, cette vérification est robuste.
  const sendNotificationCallable =
    typeof getFunctions !== "undefined"
      ? httpsCallable<MultipleUsersNotificationPayload>(
          getFunctions(),
          "sendNotificationToMultipleUsers",
        )
      : null;

  useEffect(() => {
    // Redirection si l'utilisateur n'est pas authentifié APRÈS le chargement initial
    // Le middleware devrait déjà avoir géré cela, mais c'est une sécurité supplémentaire côté client.
    if (!authLoading && !user) {
      router.push("/login"); // Redirige vers votre page de connexion
    }

    // Réinitialiser les messages de succès/erreur après un certain temps
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, successMessage, errorMessage, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      setErrorMessage("Erreur lors de la déconnexion");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Vérification côté client, même si middleware est là
    if (!user) {
      setErrorMessage(
        "Erreur: Vous devez être connecté pour envoyer des notifications.",
      );
      setLoading(false);
      return;
    }

    if (!title || !body) {
      setErrorMessage(
        "Le titre et le corps de la notification sont obligatoires.",
      );
      setLoading(false);
      return;
    }

    let parsedTargetUserIds: string[] | undefined;
    if (targetUsersInput.trim()) {
      parsedTargetUserIds = targetUsersInput
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      if (parsedTargetUserIds.length === 0) {
        parsedTargetUserIds = undefined;
      }
    }

    let parsedPayloadData: { [key: string]: string } | undefined;
    try {
      if (payloadDataInput.trim() && payloadDataInput.trim() !== "{}") {
        const parsed = JSON.parse(payloadDataInput);
        if (typeof parsed === "object" && parsed !== null) {
          parsedPayloadData = Object.entries(parsed).reduce(
            (acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            },
            {} as { [key: string]: string },
          );
        } else {
          throw new Error(
            "Les données personnalisées doivent être un objet JSON valide.",
          );
        }
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error 
        ? parseError.message 
        : "Erreur de format JSON inconnue";
      
      setErrorMessage(
        `Erreur de format pour les données personnalisées : ${errorMessage}`,
      );
      setLoading(false);
      return;
    }

    try {
      if (!sendNotificationCallable) {
        throw new Error(
          "La fonction d'envoi de notification n'est pas disponible. Veuillez vérifier la connexion Firebase.",
        );
      }

      // Appel de la Cloud Function
      const result = await sendNotificationCallable({
        title,
        body,
        targetUserIds: parsedTargetUserIds,
        payloadData: parsedPayloadData,
      });

      setSuccessMessage(
        `Notifications envoyées : Succès: ${result.data.successCount || 0}, Échecs: ${result.data.failureCount || 0}, Total: ${result.data.totalTokens || 0}.`,
      );
      setTitle("");
      setBody("");
      setTargetUsersInput("");
      setPayloadDataInput("{}");
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification:", error);
      // Les erreurs HttpsError de la fonction Cloud seront dans error.details ou error.message
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Une erreur inconnue est survenue.";
        
      setErrorMessage(`Échec de l'envoi : ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Affichage des états de chargement/authentification
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-indigo-600" />
        <p className="text-lg text-gray-700">
          Chargement de l&apos;état d&apos;authentification...
        </p>
      </div>
    );
  }

  // Si l'utilisateur n'est pas là APRÈS le chargement et que le middleware n'a pas redirigé
  // (Cela ne devrait pas arriver souvent avec le middleware, mais c'est une sécurité)
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-lg border border-red-200 bg-white p-8 text-center shadow-md">
          <ShieldAlert className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            Accès non autorisé
          </h2>
          <p className="mb-4 text-gray-600">
            Vous devez être connecté et autorisé pour accéder à cette page.
          </p>
          <button
            onClick={() => router.push("/login")} // Assurez-vous que /login est votre page de connexion
            className="rounded-md bg-indigo-600 px-6 py-2 text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  // Si l'utilisateur est connecté, affiche le formulaire
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
        {/* Header avec bouton de déconnexion */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-gray-900">
            <BellRing className="h-8 w-8 text-indigo-600" />
            Envoyer des Notifications (Admin)
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titre */}
          <div>
            <label
              htmlFor="title"
              className="block flex items-center text-sm font-medium text-gray-700"
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Titre de la
              notification <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Corps */}
          <div>
            <label
              htmlFor="body"
              className="block flex items-center text-sm font-medium text-gray-700"
            >
              <Info className="mr-2 h-4 w-4" /> Corps de la notification{" "}
              <span className="ml-1 text-red-500">*</span>
            </label>
            <textarea
              id="body"
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            ></textarea>
          </div>

          {/* UIDs Cibles */}
          <div>
            <label
              htmlFor="targetUsers"
              className="block flex items-center text-sm font-medium text-gray-700"
            >
              <User className="mr-2 h-4 w-4" /> UIDs des utilisateurs cibles
              (séparés par des virgules, laisser vide pour tous)
            </label>
            <input
              type="text"
              id="targetUsers"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="UID1, UID2, UID3..."
              value={targetUsersInput}
              onChange={(e) => setTargetUsersInput(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Ex: `L45fG...df4G, H6sd...sD5, ...`
            </p>
          </div>

          {/* Données Personnalisées */}
          <div>
            <label
              htmlFor="payloadData"
              className="block flex items-center text-sm font-medium text-gray-700"
            >
              <Code className="mr-2 h-4 w-4" /> Données personnalisées (JSON
              valide)
            </label>
            <textarea
              id="payloadData"
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder='{"key1": "value1", "key2": "value2"}'
              value={payloadDataInput}
              onChange={(e) => setPayloadDataInput(e.target.value)}
            ></textarea>
            <p className="mt-1 text-xs text-gray-500">
              Ces données seront accessibles dans le `payload.data` de la
              notification.
            </p>
          </div>

          {/* Messages de feedback */}
          {successMessage && (
            <div className="relative flex items-center gap-2 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="relative flex items-center gap-2 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              <XCircle className="h-5 w-5" />
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}

          {/* Bouton d'envoi */}
          <div>
            <button
              type="submit"
              className={`flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm ${
                loading
                  ? "cursor-not-allowed bg-indigo-400"
                  : "bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
              } `}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-3 -ml-1 h-5 w-5 animate-spin text-white" />{" "}
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-3 -ml-1 h-5 w-5" /> Envoyer les
                  notifications
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationAdminPage;