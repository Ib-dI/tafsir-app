// app/api/send-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllFCMTokens } from '@/lib/fcm-service';

export async function POST(request: NextRequest) {
  try {
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Titre et message requis' },
        { status: 400 }
      );
    }

    // Récupérer tous les tokens
    const tokens = await getAllFCMTokens();

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'Aucun utilisateur inscrit aux notifications' },
        { status: 404 }
      );
    }

    // Préparer la requête Firebase
    const serverKey = process.env.FIREBASE_SERVER_KEY;

    if (!serverKey) {
      return NextResponse.json(
        { error: 'FIREBASE_SERVER_KEY non configurée' },
        { status: 500 }
      );
    }

    // Envoyer les notifications
    const responses = await Promise.allSettled(
      tokens.map(async (token) => {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${serverKey}`,
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title,
              body,
              icon: '/icon-192x192.png',
              click_action: '/',
            },
            data: {
              url: '/',
              timestamp: new Date().toISOString(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Échec pour le token: ${token.substring(0, 20)}...`);
        }

        return response.json();
      })
    );

    const successful = responses.filter(r => r.status === 'fulfilled').length;
    const failed = responses.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Notifications envoyées: ${successful} réussies, ${failed} échouées`,
      total: tokens.length,
      successful,
      failed,
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi des notifications' },
      { status: 500 }
    );
  }
}