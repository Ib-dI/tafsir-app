// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

// Initialiser le SDK Admin
admin.initializeApp();

const corsHandler = cors({ 
    origin: [
        'https://tafsir-app.vercel.app', 
        'http://localhost:3000' 
    ] 
});

// Fonction déclenchée par HTTP pour envoyer une notification
exports.sendNewAudioNotification = functions.https.onRequest((request, response) => {
    // Permet à la fonction de gérer les requêtes CORS
    corsHandler(request, response, async () => {
        // Gérer les requêtes preflight (OPTIONS)
        if (request.method === 'OPTIONS') {
            response.status(204).send('');
            return;
        }

        // Accédez aux données envoyées par httpsCallable via request.body.data
        const audioTitle = request.body.data.audioTitle || 'Nouvel audio disponible';

        try {
            // Obtenir tous les jetons enregistrés depuis Firestore
            const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
            const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
            
            // Créer le message de notification
            const message = {
                notification: {
                    title: 'Nouveau Tafsir Audio !',
                    body: `Un nouvel audio de tafsir sur "${audioTitle}" vient d'être ajouté.`,
                },
                tokens: tokens,
            };
            
            // Envoyer le message
            const messagingResponse = await admin.messaging().sendEachForMulticast(message);
            console.log('Message envoyé avec succès :', messagingResponse);
            
            response.status(200).send({ success: true, response: messagingResponse });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message :', error);
            response.status(500).send({ success: false, error: 'Échec de l\'envoi de la notification' });
        }
    });
});