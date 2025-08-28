"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
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
  LogOut,
} from "lucide-react";

// Types
interface MultipleUsersNotificationPayload {
  title: string;
  body: string;
  targetUserIds?: string[];
  payloadData?: { [key: string]: string };
}

interface NotificationResponse {
  success: boolean;
  message: string;
  successCount: number;
  failureCount: number;
  totalTokens: number;
}

const NotificationAdminPage = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetUsersInput, setTargetUsersInput] = useState("");
  const [payloadDataInput, setPayloadDataInput] = useState("{}");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();

  // URL de ta fonction HTTP déployée
  const FUNCTION_URL =
    "https://us-central1-tafsir-app-3b154.cloudfunctions.net/sendNotificationToMultipleUsers";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
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

    if (!user) {
      setErrorMessage("Vous devez être connecté pour envoyer des notifications.");
      setLoading(false);
      return;
    }

    if (!title || !body) {
      setErrorMessage("Le titre et le corps sont obligatoires.");
      setLoading(false);
      return;
    }

    let parsedTargetUserIds: string[] | undefined;
    if (targetUsersInput.trim()) {
      parsedTargetUserIds = targetUsersInput
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }

    let parsedPayloadData: { [key: string]: string } | undefined;
    try {
      if (payloadDataInput.trim() && payloadDataInput.trim() !== "{}") {
        const parsed = JSON.parse(payloadDataInput);
        parsedPayloadData = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, String(v)])
        );
      }
    } catch (err) {
      setErrorMessage("Format JSON invalide pour les données personnalisées.");
      console.error("Erreur de parsing JSON:", err);
      setLoading(false);
      return;
    }

    try {
      // On peut ajouter le token Firebase Auth dans l’Authorization si tu veux sécuriser
      const idToken = await user.getIdToken();

      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title,
          body,
          targetUserIds: parsedTargetUserIds,
          payloadData: parsedPayloadData,
        } as MultipleUsersNotificationPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erreur réseau");
      }

      const result: NotificationResponse = await response.json();
      setSuccessMessage(
        `Notifications envoyées. Succès: ${result.successCount}, Échecs: ${result.failureCount}, Total: ${result.totalTokens}.`
      );

      setTitle("");
      setBody("");
      setTargetUsersInput("");
      setPayloadDataInput("{}");
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue."
      );
    } finally {
      setLoading(false);
    }
  };

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