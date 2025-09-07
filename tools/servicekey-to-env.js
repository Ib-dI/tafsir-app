// Sauvegarde ce script dans tools/servicekey-to-env.js
const fs = require('fs');
const path = require('path');

const keyPath = path.resolve(__dirname, '../service_key.json');
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

function escapePrivateKey(str) {
  return str.replace(/\n/g, '\\n');
}

console.log(`FIREBASE_PROJECT_ID=${key.project_id}`);
console.log(`FIREBASE_CLIENT_EMAIL=${key.client_email}`);
console.log(`FIREBASE_PRIVATE_KEY_ID=${key.private_key_id}`);
console.log(`FIREBASE_PRIVATE_KEY="${escapePrivateKey(key.private_key)}"`);
console.log(`FIREBASE_CLIENT_ID=${key.client_id}`);