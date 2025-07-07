import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TEST API Quran Foundation ===');
    
    const CLIENT_ID = process.env.QURAN_CLIENT_ID;
    const CLIENT_SECRET = process.env.QURAN_CLIENT_SECRET;
    
    console.log('Vérification des identifiants:');
    console.log('- CLIENT_ID présent:', !!CLIENT_ID);
    console.log('- CLIENT_SECRET présent:', !!CLIENT_SECRET);
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Identifiants manquants',
        message: 'Ajoutez QURAN_CLIENT_ID et QURAN_CLIENT_SECRET dans .env.local'
      });
    }
    
    // Test 1: Authentification
    console.log('Test 1: Authentification...');
    try {
      const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
      
      const authResponse = await fetch('https://prelive-oauth2.quran.foundation/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials&scope=content'
      });
      
      console.log('Réponse authentification:', authResponse.status, authResponse.statusText);
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('Erreur authentification:', errorText);
        return NextResponse.json({
          success: false,
          error: 'Erreur d\'authentification',
          status: authResponse.status,
          details: errorText
        });
      }
      
      const authData = await authResponse.json();
      const token = authData.access_token;
      console.log('✅ Authentification réussie');
      
      // Test 2: Récupération des sourates
      console.log('Test 2: Récupération des sourates...');
      const chaptersResponse = await fetch('https://apis-prelive.quran.foundation/content/api/v4/chapters', {
        headers: {
          'x-auth-token': token,
          'x-client-id': CLIENT_ID
        }
      });
      
      console.log('Réponse sourates:', chaptersResponse.status, chaptersResponse.statusText);
      
      if (!chaptersResponse.ok) {
        const errorText = await chaptersResponse.text();
        console.error('Erreur sourates:', errorText);
        return NextResponse.json({
          success: false,
          error: 'Erreur récupération sourates',
          status: chaptersResponse.status,
          details: errorText
        });
      }
      
      const chaptersData = await chaptersResponse.json();
      console.log('✅ Sourates récupérées:', chaptersData.chapters?.length || chaptersData.data?.length || 0);
      
      // Test 3: Récupération des versets
      console.log('Test 3: Récupération des versets (sourate 1)...');
      const versesResponse = await fetch('https://apis-prelive.quran.foundation/content/api/v4/verses/by_chapter/1?language=fr&words=true&translations=131&tafsirs=198', {
        headers: {
          'x-auth-token': token,
          'x-client-id': CLIENT_ID
        }
      });
      
      console.log('Réponse versets:', versesResponse.status, versesResponse.statusText);
      
      if (!versesResponse.ok) {
        const errorText = await versesResponse.text();
        console.error('Erreur versets:', errorText);
        return NextResponse.json({
          success: false,
          error: 'Erreur récupération versets',
          status: versesResponse.status,
          details: errorText
        });
      }
      
      const versesData = await versesResponse.json();
      console.log('✅ Versets récupérés:', versesData.verses?.length || versesData.data?.length || 0);
      
      return NextResponse.json({
        success: true,
        message: 'Tous les tests ont réussi',
        data: {
          chapters: chaptersData.chapters || chaptersData.data || [],
          verses: versesData.verses || versesData.data || []
        }
      });
      
    } catch (error) {
      console.error('Erreur lors des tests:', error);
      return NextResponse.json({
        success: false,
        error: 'Erreur lors des tests',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
    
  } catch (error) {
    console.error('Erreur générale:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur générale',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 