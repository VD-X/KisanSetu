const admin = require("firebase-admin");

const firebaseAdminConfig = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

let isInitialized = false;

// Only initialize if we have the necessary configuration and not already initialized
if (process.env.FIREBASE_PROJECT_ID && admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(firebaseAdminConfig)
        });
        isInitialized = true;
        console.log("Firebase Admin initialized successfully");
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
} else if (admin.apps.length > 0) {
    isInitialized = true;
} else {
    console.warn("Firebase Admin NOT initialized: Missing configuration (FIREBASE_PROJECT_ID)");
}

// Export a helper to check initialization
admin.isReady = () => isInitialized;

module.exports = admin;
