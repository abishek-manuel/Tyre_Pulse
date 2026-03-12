/**
 * Auth Service
 * Handles user login/logout and session management using Firebase Auth.
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Init listener for auth state changes
        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        photoURL: user.photoURL
                    };
                    // Cache user in localStorage for quick synchronous access on page load
                    localStorage.setItem('tyre_pulse_user', JSON.stringify(this.currentUser));
                } else {
                    this.currentUser = null;
                    localStorage.removeItem('tyre_pulse_user');
                }
            });
        }

        // Load cached user immediately
        const storedUser = localStorage.getItem('tyre_pulse_user');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
        }
    }

    async login(email, password) {
        if (!firebase) throw new Error("Firebase SDK not loaded.");
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            // Ensure the user object is set immediately after login
            const user = userCredential.user;
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL
            };
            localStorage.setItem('tyre_pulse_user', JSON.stringify(this.currentUser));
            return userCredential.user;
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    }

    async register(email, password, role = 'user') {
        if (!firebase) throw new Error("Firebase SDK not loaded.");
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Save user profile to Firestore with role field
            await firebase.firestore().collection('users').doc(user.uid).set({
                email: email,
                displayName: user.displayName || email.split('@')[0],
                role: role,   // 'user' for regular users, 'owner' for shop owners
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL
            };
            localStorage.setItem('tyre_pulse_user', JSON.stringify(this.currentUser));
            return userCredential.user;
        } catch (error) {
            console.error("Registration Error:", error);
            throw error;
        }
    }

    async loginWithGoogle() {
        if (!firebase) throw new Error("Firebase SDK not loaded.");
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;

            // Save/Update user profile in Firestore on Google Login
            await firebase.firestore().collection('users').doc(user.uid).set({
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            };
            localStorage.setItem('tyre_pulse_user', JSON.stringify(this.currentUser));
            return user;
        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    }

    async logout() {
        if (!firebase) return;
        try {
            await firebase.auth().signOut();
            this.currentUser = null;
            localStorage.removeItem('tyre_pulse_user');
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getUser() {
        return this.currentUser;
    }

    async changePassword(newPassword) {
        if (!firebase) throw new Error("Firebase SDK not loaded.");
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error("No user is currently signed in. User must be signed in to change password.");
        }
        try {
            await user.updatePassword(newPassword);
            console.log("Password updated successfully.");
        } catch (error) {
            console.error("Change Password Error:", error);
            throw error;
        }
    }
}

window.authService = new AuthService();
