import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* ---------------------------------------------------------------------------
   Firebase configuration placeholders.

   Replace these six values with the ones from your own Firebase project
   (Console → Project settings → General → Your apps) before deploying.
   The rest of GuardHai runs without them: Firebase is optional and is loaded
   with a dynamic import, so an unconfigured build still works offline.
   --------------------------------------------------------------------------- */
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_FIREBASE_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
window.db = db;

window.FirebaseService = {
    async loginWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            enterGuardHaiHome();
        } catch(e) {
alert("Google Auth Error: " + e.message);
        }
    },

    async resetPassword(email) {
        await sendPasswordResetEmail(auth, email);
    },

    // Remote Shield cloud channel. Writes only for authenticated GuardHai users.
    async syncRemoteShieldEvent(device, event) {
        if (!auth.currentUser) throw new Error('Sign in is required for Remote Shield cloud sync.');
        const deviceId = String(device.id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
        await setDoc(doc(db, 'remoteShieldDevices', auth.currentUser.uid, 'devices', deviceId), {
            deviceId: device.id,
            name: device.name,
            status: device.remoteStatus || device.status || 'protected',
            nearbyState: device.btState || 'MONITORING',
            lastEvent: event.type,
            lastConnection: event.lastConnection || 'Bluetooth',
            lastUpdate: serverTimestamp(),
            updatedBy: 'owner-phone'
        }, { merge: true });
    }
};

onAuthStateChanged(auth, async (user) => {
    const isLoggedIn = localStorage.getItem('guardhai_logged_in') === 'true';
    if (user || isLoggedIn) {
        localStorage.setItem('guardhai_logged_in', 'true');
        setTimeout(() => {
            document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
            enterGuardHaiHome();
        }, 1000);
    } else {
        setTimeout(() => {
            if (AuthFlow.currentScreen === 'splash') AuthFlow.goTo('welcome-anim');
        }, 1500);
    }
});
