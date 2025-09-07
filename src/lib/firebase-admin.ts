import * as admin from 'firebase-admin';

export function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.app();

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing Firebase Admin env vars');
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export function getAdminMessaging(): admin.messaging.Messaging {
  return getAdminApp().messaging();
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return admin.firestore(getAdminApp());
}


