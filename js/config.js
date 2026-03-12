// Firebase Configuration
// REPLACE THE VALUES BELOW WITH YOUR NEW FIREBASE PROJECT CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyD-k57hF0Jx3IjRFhsIJRPKNnB_uu47Cr8",
    authDomain: "tire-wear.firebaseapp.com",
    projectId: "tire-wear",
    storageBucket: "tire-wear.firebasestorage.app",
    messagingSenderId: "122700135664",
    appId: "1:122700135664:web:069052d3717d86d7d61635",
    measurementId: "G-6FZXHZ15KL"
};

// Initialize Firebase
// Using Compat SDK (Global 'firebase' object)
let app;
let auth;
let db;
let analytics;

try {
    if (typeof firebase !== 'undefined') {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        // Initialize Analytics if available
        if (firebase.analytics) {
            analytics = firebase.analytics();
        }

        console.log("Firebase initialized successfully with project: " + firebaseConfig.projectId);
    } else {
        console.error("Firebase SDK not loaded. Make sure to include the CDN scripts in your HTML.");
    }
} catch (e) {
    if (e.code === 'app/duplicate-app') {
        app = firebase.app();
        auth = firebase.auth();
        db = firebase.firestore();
        if (firebase.analytics) analytics = firebase.analytics();
    } else {
        console.error("Firebase Initialization Error:", e);
    }
}

// Shared configuration object
window.APP_CONFIG = {
    firebaseConfig: firebaseConfig,
    useMock: false
};

// Expose services globally
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseAnalytics = analytics;
