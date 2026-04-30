const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const credentialsPath = path.join(__dirname, 'credentials.json');
const tokenPath = path.join(__dirname, 'token.json');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube'];

async function generateToken() {
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ credentials.json not found!');
    return;
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force consent to ensure we get a refresh token
  });

  console.log('🚀 Authorize this app by visiting this url:', authUrl);

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.indexOf('/oauth2callback') > -1) {
        const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
        const code = qs.get('code');
        console.log('✅ Code received. Exchanging for tokens...');
        
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
        console.log('✨ Token stored to', tokenPath);
        
        res.end('Authentication successful! You can close this window now.');
        server.close();
        process.exit(0);
      }
    } catch (e) {
      console.error('❌ Error getting token:', e.message);
      res.end('Authentication failed.');
      process.exit(1);
    }
  }).listen(3000, () => {
    console.log('📡 Listening on port 3000 for the callback...');
  });
}

generateToken();
