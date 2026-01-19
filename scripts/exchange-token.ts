
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost';
const CODE = process.env.AUTH_CODE || 'YOUR_AUTH_CODE';

async function main() {
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    try {
        const { tokens } = await oauth2Client.getToken(CODE);
        console.log('--- TOKENS RECEIVED ---');
        console.log('Refresh Token:', tokens.refresh_token);
        console.log('Access Token:', tokens.access_token);
        console.log('Expiry Date:', tokens.expiry_date);
    } catch (error) {
        console.error('Error exchanging token:', error);
    }
}

main();
