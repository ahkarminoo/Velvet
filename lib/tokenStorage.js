import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.join(process.cwd(), 'temp-registration-tokens.json');

// Ensure the file exists
if (!fs.existsSync(TOKENS_FILE)) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify({}));
}

export function saveToken(token, data) {
  try {
    const tokens = getAllTokens();
    tokens[token] = data;
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    console.log('🔑 Token saved to file:', token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
}

export function getToken(token) {
  try {
    const tokens = getAllTokens();
    const tokenData = tokens[token];
    
    if (tokenData) {
      // Check if expired
      const now = Date.now();
      if (now > tokenData.expiresAt) {
        // Remove expired token
        delete tokens[token];
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
        console.log('🗑️ Expired token removed:', token);
        return null;
      }
      console.log('✅ Token found:', token);
      return tokenData;
    }
    
    console.log('❌ Token not found:', token);
    return null;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

export function deleteToken(token) {
  try {
    const tokens = getAllTokens();
    delete tokens[token];
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    console.log('🗑️ Token deleted:', token);
  } catch (error) {
    console.error('Error deleting token:', error);
  }
}

export function getAllTokens() {
  try {
    const data = fs.readFileSync(TOKENS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tokens file:', error);
    return {};
  }
}

export function cleanupExpiredTokens() {
  try {
    const tokens = getAllTokens();
    const now = Date.now();
    let cleaned = 0;
    
    Object.keys(tokens).forEach(token => {
      if (now > tokens[token].expiresAt) {
        delete tokens[token];
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
      console.log(`🧹 Cleaned up ${cleaned} expired tokens`);
    }
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
  }
}
