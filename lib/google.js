const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verifies a Google Identity Services ID token and returns the payload
// (throws if the token is invalid, expired, or issued for a different app).
async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  return ticket.getPayload();
}

module.exports = { verifyGoogleToken };
