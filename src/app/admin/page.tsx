'use client';

import ManualTrigger from "@/components/ManualTrigger";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord administrateur</h1>
        <Button onClick={handleLogout} variant="outline">
          Se déconnecter
        </Button>
      </div>
      <ManualTrigger />
    </div>
  );
}