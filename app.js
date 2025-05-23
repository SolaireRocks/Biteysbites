// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Optional: if you want to use analytics

// Import Authentication functions
import {
    getAuth,
    GoogleAuthProvider,
    OAuthProvider, // For Discord
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

// Import Firestore functions (we'll use this to save user profiles)
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPNx_s6eOCD69LDUNeCWLeL3tqoYKoTV8", // YOUR ACTUAL API KEY
  authDomain: "biteysbites.firebaseapp.com",
  projectId: "biteysbites",
  storageBucket: "biteysbites.firebasestorage.app",
  messagingSenderId: "192250302371",
  appId: "1:192250302371:web:b0557cae57ef9575f69416",
  measurementId: "G-Y0B3P5EPLK" // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Uncomment if you want to use analytics

// Initialize Firebase Authentication and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginGoogleBtn = document.getElementById('loginGoogleBtn');
const loginDiscordBtn = document.getElementById('loginDiscordBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfoDiv = document.getElementById('userInfo');
const userNameSpan = document.getElementById('userName');
const userPhotoImg = document.getElementById('userPhoto');
const gameLinksContainerP = document.querySelector('#game-links-container p');
const gameListUl = document.getElementById('gameList');


// --- Authentication Logic ---

// Google Sign-In
loginGoogleBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Google Sign-In Successful", result.user);
            // User is signed in. You can access user info via result.user
            // The onAuthStateChanged listener will handle UI updates and saving user data.
        })
        .catch((error) => {
            console.error("Google Sign-In Error", error);
            alert(`Google Sign-In Error: ${error.message}`);
        });
});

// Discord Sign-In
loginDiscordBtn.addEventListener('click', () => {
    const provider = new OAuthProvider('discord.com'); // Ensure 'discord.com' is enabled in Firebase Console
    // You might want to request specific scopes if needed:
    // provider.addScope('identify');
    // provider.addScope('email');

    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Discord Sign-In Successful", result.user);
            // The onAuthStateChanged listener will handle UI updates and saving user data.
        })
        .catch((error) => {
            console.error("Discord Sign-In Error", error);
            // Handle specific errors, e.g., account exists with different credential
            if (error.code === 'auth/account-exists-with-different-credential') {
                alert('An account already exists with the same email address but different sign-in credentials. Try signing in with the original provider.');
            } else {
                alert(`Discord Sign-In Error: ${error.message}`);
            }
        });
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("User signed out");
        // UI will be updated by onAuthStateChanged
    }).catch((error) => {
        console.error("Sign Out Error", error);
    });
});

// Listener for Authentication State Changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log("Auth State Changed: User Logged In", user);
        userInfoDiv.style.display = 'block';
        userNameSpan.textContent = user.displayName || user.email;
        if (user.photoURL) {
            userPhotoImg.src = user.photoURL;
            userPhotoImg.style.display = 'block';
        } else {
            userPhotoImg.style.display = 'none';
        }
        loginGoogleBtn.style.display = 'none';
        loginDiscordBtn.style.display = 'none';

        gameLinksContainerP.style.display = 'none';
        gameListUl.style.display = 'block';

        // Save or update user in Firestore
        saveUserData(user);

    } else {
        // User is signed out
        console.log("Auth State Changed: User Logged Out");
        userInfoDiv.style.display = 'none';
        loginGoogleBtn.style.display = 'block';
        loginDiscordBtn.style.display = 'block';

        gameLinksContainerP.style.display = 'block';
        gameListUl.style.display = 'none';
    }
});

// --- Firestore User Data Management ---
async function saveUserData(user) {
    const userRef = doc(db, "users", user.uid); // Use user's UID as document ID

    try {
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            // New user: create their profile
            console.log("Creating new user profile in Firestore for:", user.uid);
            await setDoc(userRef, {
                uid: user.uid,
                displayName: user.displayName || "Anonymous",
                email: user.email,
                photoURL: user.photoURL || null,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                // Add initial game stats here if needed
                // e.g., game1_wins: 0, game1_losses: 0
            });
        } else {
            // Existing user: update last login time
            console.log("Updating last login for user:", user.uid);
            await updateDoc(userRef, {
                lastLogin: serverTimestamp(),
                // Optionally update display name and photo URL if they might change
                displayName: user.displayName || docSnap.data().displayName,
                photoURL: user.photoURL || docSnap.data().photoURL
            });
        }
    } catch (error) {
        console.error("Error saving user data to Firestore:", error);
    }
}