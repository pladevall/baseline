
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost'; // Ensure this matches what's used in credentials.json

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly'
];

const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial for refresh token
    scope: scopes,
    prompt: 'consent' // Force new refresh token delivery
});

console.log(`
================================================================================
COPY AND PASTE THE URL BELOW INTO YOUR BROWSER:
================================================================================
${url}
================================================================================
`);
console.log('After authorizing, you will be redirected to http://localhost/?code=...');
console.log('The page might fail to load (Connection Refused), this is NORMAL.');
console.log('Look at your browser address bar.');
console.log('Copy the text after "code=" and PASTE IT HERE.');
