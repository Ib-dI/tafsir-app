// app/api/send-notification/route.ts
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { ServiceAccount } from 'firebase-admin';

// Load service account configuration
function getServiceAccount(): ServiceAccount {
  try {
    // Try to load from file first
    return require('../../../../service_key.json') as ServiceAccount;
  } catch (fileError) {
    console.log('Service account file not found, trying environment variables...');
    
    // Fallback to environment variables
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('No Firebase service account configuration found. Please provide either service_key.json file or environment variables.');
    }
    
    return {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID!,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID!,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL!,
      client_id: process.env.FIREBASE_CLIENT_ID!,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
    } as ServiceAccount;
  }
}

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId || 'tafsir-app-3b154',
    });
  }
  return admin.app();
}

export async function POST(request: Request) {
  console.log('🔔 Notification request received');
  
  try {
    // Initialize Firebase Admin
    const app = initializeFirebaseAdmin();
    console.log('✅ Firebase Admin initialized');

    // Parse and validate request
    const body = await request.json();
    const { audioTitle, audioUrl } = body;

    if (!audioTitle || !audioUrl) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: audioTitle and audioUrl are required' 
        }, 
        { status: 400 }
      );
    }

    console.log('📝 Processing notification for:', { audioTitle, audioUrl });

    const firestore = getFirestore(app);

    // Get active FCM tokens
    console.log('🔍 Fetching active FCM tokens...');
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const tokensSnapshot = await firestore.collection('fcmTokens')
      .where('active', '==', true)
      .where('lastUsed', '>', thirtyDaysAgo)
      .get();

    console.log(`📊 Found ${tokensSnapshot.size} potential tokens`);

    const registrationTokens: string[] = [];
    const invalidTokens: string[] = [];

    tokensSnapshot.forEach((doc) => {
      const tokenData = doc.data();
      if (tokenData.token && typeof tokenData.token === 'string') {
        registrationTokens.push(tokenData.token);
      } else {
        invalidTokens.push(doc.id);
      }
    });

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      console.log(`🧹 Cleaning up ${invalidTokens.length} invalid tokens`);
      const batch = firestore.batch();
      invalidTokens.forEach((tokenId) => {
        batch.delete(firestore.collection('fcmTokens').doc(tokenId));
      });
      await batch.commit();
    }

    if (registrationTokens.length === 0) {
      console.log('⚠️ No active FCM tokens found');
      return NextResponse.json({ 
        success: true,
        message: 'No active FCM tokens found. No notifications sent.',
        data: {
          successCount: 0,
          failureCount: 0,
          totalTokens: 0,
          invalidTokensRemoved: invalidTokens.length
        }
      });
    }

    console.log(`🎯 Sending notifications to ${registrationTokens.length} devices`);

    // Prepare notification message
    const message = {
      notification: {
        title: `Nouvel Audio : ${audioTitle}`,
        body: 'Un nouveau tafsir est disponible ! Cliquez pour l\'écouter.',
      },
      webpush: {
        notification: {
          title: `Nouvel Audio : ${audioTitle}`,
          body: 'Un nouveau tafsir est disponible ! Cliquez pour l\'écouter.',
          icon: '/bismillah.png',
          badge: '/fingerprint.webp',
          vibrate: [100, 50, 100],
          actions: [
            {
              action: 'listen',
              title: 'Écouter maintenant'
            }
          ]
        },
        fcm_options: {
          link: audioUrl,
        },
        headers: {
          Urgency: 'high',
        },
      },
      data: {
        type: 'new_audio',
        audioTitle,
        audioUrl,
        timestamp: Date.now().toString(),
      },
    };

    // Send notifications
    const response = await admin.messaging().sendEachForMulticast({
      tokens: registrationTokens,
      ...message,
    });

    console.log(`📤 Sent notifications: ${response.successCount} successful, ${response.failureCount} failed`);

    // Process failed tokens
    const failedTokens: Array<{token: string, error: string}> = [];
    const tokensToRemove: string[] = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const token = registrationTokens[idx];
        const errorCode = resp.error.code;
        
        failedTokens.push({
          token,
          error: resp.error.message || 'Unknown error'
        });

        // Mark tokens for removal if they're invalid/unregistered
        if (errorCode === 'messaging/invalid-registration-token' || 
            errorCode === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(token);
        }
      }
    });

    // Remove invalid tokens from database
    if (tokensToRemove.length > 0) {
      console.log(`🧹 Removing ${tokensToRemove.length} invalid/expired tokens`);
      
      // Get documents that match the invalid tokens
      const invalidTokenDocs = await Promise.all(
        tokensToRemove.map(async (token) => {
          const snapshot = await firestore.collection('fcmTokens')
            .where('token', '==', token)
            .get();
          return snapshot.docs;
        })
      );

      // Flatten and remove duplicates
      const docsToDelete = invalidTokenDocs.flat();
      
      if (docsToDelete.length > 0) {
        const batch = firestore.batch();
        docsToDelete.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        try {
          await batch.commit();
          console.log(`✅ Successfully removed ${docsToDelete.length} invalid tokens from database`);
        } catch (batchError) {
          console.error('❌ Error removing invalid tokens:', batchError);
        }
      }
    }

    const result = {
      success: response.successCount > 0,
      message: response.successCount > 0 
        ? `Notifications sent successfully to ${response.successCount} device${response.successCount > 1 ? 's' : ''}`
        : 'No notifications were sent successfully',
      data: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: registrationTokens.length,
        invalidTokensRemoved: invalidTokens.length + tokensToRemove.length,
        ...(failedTokens.length > 0 && { 
          failedTokens: failedTokens.slice(0, 5) // Only show first 5 for debugging
        })
      }
    };

    console.log('✅ Notification process completed:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in notification API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json({ 
      success: false,
      message: 'Failed to send notification', 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      message: 'Method not allowed. Use POST to send notifications.',
      endpoints: {
        POST: 'Send notifications to FCM tokens',
        body: {
          audioTitle: 'string (required)',
          audioUrl: 'string (required)'
        }
      }
    }, 
    { status: 405 }
  );
}