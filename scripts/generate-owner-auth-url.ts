import dotenv from 'dotenv';
import { centralDriveStorage, ADMIN_EMAIL } from '../src/server/centralDriveStorage.js';

dotenv.config();

const clientId = centralDriveStorage.getClientId();
const redirectUri = 'https://developers.google.com/oauthplayground';
const scopes = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(clientId)}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(scopes)}&` +
  `access_type=offline&` +
  `prompt=consent&` +
  `login_hint=${encodeURIComponent(ADMIN_EMAIL)}`;

console.log('============================================================');
console.log('LILVERSE OWNER GOOGLE DRIVE OAUTH AUTHORIZATION URL');
console.log('============================================================');
console.log('Target Owner Account:', ADMIN_EMAIL);
console.log('Client ID:', clientId);
console.log('\nOpen this URL in your browser while signed in as hpragada0508@gmail.com:\n');
console.log(authUrl);
console.log('\n============================================================');
