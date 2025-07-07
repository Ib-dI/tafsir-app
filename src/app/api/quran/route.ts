import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.QURAN_CLIENT_ID;
const CLIENT_SECRET = process.env.QURAN_CLIENT_SECRET;

// Fonction pour obtenir le token d'accès
async function getAccessToken() {
  console.log('Tentative d\'obtention du token avec:', { 
    hasClientId: !!CLIENT_ID, 
    hasClientSecret: !!CLIENT_SECRET 
  });

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Identifiants Quran Foundation non configurés. Ajoutez QURAN_CLIENT_ID et QURAN_CLIENT_SECRET dans .env.local');
  }

  try {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    console.log('Envoi de la requête d\'authentification...');
    
    const response = await fetch('https://prelive-oauth2.quran.foundation/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=content'
    });

    console.log('Réponse d\'authentification:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur authentification:', response.status, errorText);
      throw new Error(`Erreur d'authentification: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Token obtenu avec succès');
    return data.access_token;
  } catch (err) {
    console.error('Erreur lors de l\'obtention du token:', err);
    throw err;
  }
}

// Fonction pour récupérer les sourates via l'API publique (fallback)
async function getChaptersPublic() {
  try {
    console.log('Récupération des sourates via API publique...');
    const response = await fetch('https://api.quran.com/api/v4/chapters?language=fr');
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Sourates récupérées (API publique):', data.chapters?.length || 0);
    return data.chapters || [];
  } catch (err) {
    console.error('Erreur lors de la récupération des sourates (API publique):', err);
    throw err;
  }
}

// Fonction pour récupérer les versets via l'API publique (fallback)
async function getVersesPublic(chapterId: number) {
  try {
    console.log(`Récupération des versets (sourate ${chapterId}) via API publique...`);
    const response = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=fr&words=true&translations=131&tafsirs=198`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Versets récupérés (API publique):', data.verses?.length || 0);
    return data.verses || [];
  } catch (err) {
    console.error('Erreur lors de la récupération des versets (API publique):', err);
    throw err;
  }
}

// Fonction pour récupérer les sourates via l'API Quran Foundation
async function getChapters(token: string) {
  try {
    console.log('Récupération des sourates...');
    
    const response = await fetch('https://apis-prelive.quran.foundation/content/api/v4/chapters', {
      headers: {
        'x-auth-token': token,
        'x-client-id': CLIENT_ID!
      }
    });

    console.log('Réponse sourates:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur API Quran Foundation (chapters):', response.status, errorText);
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Sourates récupérées:', data.chapters?.length || data.data?.length || 0);
    return data.chapters || data.data || [];
  } catch (err) {
    console.error('Erreur lors de la récupération des sourates:', err);
    throw err;
  }
}

// Fonction pour récupérer les versets via l'API Quran Foundation
async function getVerses(chapterId: number, token: string) {
  try {
    console.log(`Récupération des versets pour la sourate ${chapterId}...`);
    
    const url = `https://apis-prelive.quran.foundation/content/api/v4/verses/by_chapter/${chapterId}?language=fr&words=true&translations=131&tafsirs=198`;
    console.log('URL des versets:', url);
    
    const response = await fetch(url, {
      headers: {
        'x-auth-token': token,
        'x-client-id': CLIENT_ID!
      }
    });

    console.log('Réponse versets:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur API Quran Foundation (verses):', response.status, errorText);
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Versets récupérés:', data.verses?.length || data.data?.length || 0);
    return data.verses || data.data || [];
  } catch (err) {
    console.error('Erreur lors de la récupération des versets:', err);
    throw err;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const chapterId = searchParams.get('chapterId');

    console.log('=== API Quran Foundation appelée ===');
    console.log('Paramètres:', { action, chapterId, hasCredentials: !!(CLIENT_ID && CLIENT_SECRET) });

    // Essayer d'abord l'API authentifiée si les identifiants sont présents
    if (CLIENT_ID && CLIENT_SECRET) {
      try {
        console.log('✅ Identifiants présents, tentative avec API authentifiée...');
        
        // Obtenir le token d'accès
        const token = await getAccessToken();

        if (action === 'chapters') {
          console.log('📖 Récupération des sourates (API authentifiée)...');
          const chapters = await getChapters(token);
          console.log('✅ Sourates récupérées avec succès (API authentifiée)');
          return NextResponse.json({ success: true, data: chapters, source: 'quran.foundation' });
        }

        if (action === 'verses' && chapterId) {
          console.log(`📖 Récupération des versets pour la sourate ${chapterId} (API authentifiée)...`);
          const verses = await getVerses(parseInt(chapterId), token);
          console.log('✅ Versets récupérés avec succès (API authentifiée)');
          return NextResponse.json({ success: true, data: verses, source: 'quran.foundation' });
        }
      } catch (authError) {
        console.log('❌ Erreur avec l\'API authentifiée, basculement vers API publique:', authError);
      }
    } else {
      console.log('⚠️ Identifiants manquants, utilisation de l\'API publique');
    }

    // Fallback vers l'API publique
    if (action === 'chapters') {
      console.log('📖 Récupération des sourates (API publique)...');
      const chapters = await getChaptersPublic();
      console.log('✅ Sourates récupérées avec succès (API publique)');
      return NextResponse.json({ success: true, data: chapters, source: 'quran.com' });
    }

    if (action === 'verses' && chapterId) {
      console.log(`📖 Récupération des versets pour la sourate ${chapterId} (API publique)...`);
      const verses = await getVersesPublic(parseInt(chapterId));
      console.log('✅ Versets récupérés avec succès (API publique)');
      return NextResponse.json({ success: true, data: verses, source: 'quran.com' });
    }

    console.log('❌ Action non reconnue:', action);
    return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });

  } catch (error) {
    console.error('=== ERREUR API Quran Foundation ===');
    console.error('Type d\'erreur:', error?.constructor?.name);
    console.error('Message:', error instanceof Error ? error.message : 'Erreur inconnue');
    console.error('Stack:', error instanceof Error ? error.stack : 'Pas de stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Erreur inconnue',
          stack: error instanceof Error ? error.stack : 'Pas de stack trace'
        } : undefined
      },
      { status: 500 }
    );
  }
} 