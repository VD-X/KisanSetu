const admin = require("firebase-admin");

const getCleanPrivateKey = (key) => {
    if (!key) return undefined;
    
    // 1. Remove surrounding quotes and trim
    let cleaned = key.trim().replace(/^"|"$/g, '');
    
    // 2. Handle escaped newlines (both literal and from env vars)
    cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\r/g, '');
    
    // 3. Absolute PEM Restorer: Rebuild the key from its base64 core.
    // This handles cases where the key has non-standard line breaks or extra spaces.
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    
    if (cleaned.includes(header) && cleaned.includes(footer)) {
        // Extract ONLY the base64 body (strip headers, footers, and ALL whitespace)
        const core = cleaned
            .replace(header, '')
            .replace(footer, '')
            .replace(/[\s\r\n]/g, ''); // Strip all hidden characters
        
        // Reconstruct with precise 64-character line breaks (PEM strict standard)
        const chunks = [];
        for (let i = 0; i < core.length; i += 64) {
            chunks.push(core.substring(i, i + 64));
        }
        return `${header}\n${chunks.join('\n')}\n${footer}\n`;
    }
    
    return cleaned;
};

const firebaseAdminConfig = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: getCleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

let isInitialized = false;
let initializationError = null;

// Only initialize if we have the necessary configuration and not already initialized
if (process.env.FIREBASE_PROJECT_ID && admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(firebaseAdminConfig)
        });
        isInitialized = true;
        console.log("Firebase Admin initialized successfully");
    } catch (error) {
        initializationError = error.message;
        console.error("Firebase Admin initialization error:", error);
    }
} else if (admin.apps.length > 0) {
    isInitialized = true;
} else {
    const missing = [];
    if (!process.env.FIREBASE_PROJECT_ID) missing.push("FIREBASE_PROJECT_ID");
    if (!process.env.FIREBASE_PRIVATE_KEY) missing.push("FIREBASE_PRIVATE_KEY");
    initializationError = missing.length > 0 ? `Missing: ${missing.join(', ')}` : "Unknown reason";
    console.warn("Firebase Admin NOT initialized:", initializationError);
}

// Export a helper to check initialization
admin.isReady = () => isInitialized;
admin.getError = () => initializationError;
admin.getDiagnostic = () => ({
    keyExists: !!process.env.FIREBASE_PRIVATE_KEY,
    keyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    keyPrefix: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 10) + "..." : "none"
});

module.exports = admin;
