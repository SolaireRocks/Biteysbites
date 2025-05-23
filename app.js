// app.js
import { initializeApp } from "firebase/app";
import {
    getAuth, GoogleAuthProvider, OAuthProvider,
    signInWithPopup, signOut, onAuthStateChanged
} from "firebase/auth";
import {
    getFirestore, doc, setDoc, getDoc, updateDoc,
    serverTimestamp, collection, query, where, getDocs
} from "firebase/firestore";
// Import Firebase Functions SDK
import { getFunctions, httpsCallable } from "firebase/functions";


// Your web app's Firebase configuration (remains the same)
const firebaseConfig = {
  apiKey: "AIzaSyCPNx_s6eOCD69LDUNeCWLeL3tqoYKoTV8", // YOUR ACTUAL API KEY
  authDomain: "biteysbites.firebaseapp.com",
  projectId: "biteysbites",
  storageBucket: "biteysbites.firebasestorage.app",
  messagingSenderId: "192250302371",
  appId: "1:192250302371:web:b0557cae57ef9575f69416",
  measurementId: "G-Y0B3P5EPLK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app); // Initialize Firebase Functions

// --- Client-Side Bad Word List (Can be kept for quick UX, but server is authority) ---
const CLIENT_SIDE_BAD_WORDS = ["admin", "root", "moderator"]; // Keep this list very minimal or remove

// DOM Elements (remains the same)
const loginGoogleBtn = document.getElementById('loginGoogleBtn');
const loginDiscordBtn = document.getElementById('loginDiscordBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginButtonsContainer = document.getElementById('login-buttons-container');
const userInfoContainer = document.getElementById('user-info-container');
const userPhoto = document.getElementById('userPhoto');
const greetingNameSpan = document.getElementById('greetingName');
const displayedUsernameSpan = document.getElementById('displayedUsername');
const profileSetupDiv = document.getElementById('profile-setup');
const preferredNameInput = document.getElementById('preferredNameInput');
const firstNameInput = document.getElementById('firstNameInput');
const usernameInput = document.getElementById('usernameInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileErrorP = document.getElementById('profileError');
const gameLinksContainerP = document.querySelector('#game-links-container p');
const gameListUl = document.getElementById('gameList');

// --- Callable Cloud Function ---
const validateUsernameFunction = httpsCallable(functions, 'validateUsername');

// --- Authentication Logic (remains mostly the same) ---
loginGoogleBtn.addEventListener('click', () => handleSignIn(new GoogleAuthProvider()));
loginDiscordBtn.addEventListener('click', () => handleSignIn(new OAuthProvider('discord.com')));

function handleSignIn(provider) {
    signInWithPopup(auth, provider)
        .then((result) => console.log(`${provider.providerId} Sign-In Successful`, result.user))
        .catch((error) => {
            console.error(`${provider.providerId} Sign-In Error`, error);
            if (error.code === 'auth/account-exists-with-different-credential') {
                alert('An account already exists with the same email but different sign-in. Try the original provider.');
            } else {
                alert(`${provider.providerId} Sign-In Error: ${error.message}`);
            }
        });
}

logoutBtn.addEventListener('click', () => {
    signOut(auth).catch((error) => console.error("Sign Out Error", error));
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await saveInitialUserData(user);
        await refreshUserProfileDisplay(user);
    } else {
        loginButtonsContainer.style.display = 'block';
        userInfoContainer.style.display = 'none';
        profileSetupDiv.style.display = 'none';
        gameLinksContainerP.textContent = 'Please log in and complete your profile to see available games.';
        gameLinksContainerP.style.display = 'block';
        gameListUl.style.display = 'none';
        clearProfileForm();
    }
});

function clearProfileForm() {
    preferredNameInput.value = '';
    firstNameInput.value = '';
    usernameInput.value = '';
    profileErrorP.style.display = 'none';
    profileErrorP.textContent = '';
}


// --- Firestore User Data Management (remains the same) ---
async function saveInitialUserData(firebaseUser) {
    const userRef = doc(db, "users", firebaseUser.uid);
    try {
        const docSnap = await getDoc(userRef);
        const dataToSet = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            lastLogin: serverTimestamp(),
            providerDisplayName: firebaseUser.displayName || null,
            photoURL: firebaseUser.photoURL || null,
        };
        if (!docSnap.exists()) {
            await setDoc(userRef, { ...dataToSet, createdAt: serverTimestamp() });
        } else {
            await updateDoc(userRef, dataToSet);
        }
    } catch (error) {
        console.error("Error saving initial user data:", error);
    }
}

async function loadUserProfile(uid) {
    if (!uid) return null;
    const userRef = doc(db, "users", uid);
    try {
        const docSnap = await getDoc(userRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error loading user profile:", error);
        return null;
    }
}

async function refreshUserProfileDisplay(firebaseUser) {
    const userProfile = await loadUserProfile(firebaseUser.uid);
    loginButtonsContainer.style.display = 'none';

    if (userProfile && userProfile.username && userProfile.preferredName) {
        userInfoContainer.style.display = 'block';
        profileSetupDiv.style.display = 'none';
        greetingNameSpan.textContent = userProfile.preferredName;
        displayedUsernameSpan.textContent = userProfile.username;
        if (firebaseUser.photoURL) {
            userPhoto.src = firebaseUser.photoURL;
            userPhoto.style.display = 'block';
        } else if (userProfile.photoURL) {
            userPhoto.src = userProfile.photoURL;
            userPhoto.style.display = 'block';
        } else {
            userPhoto.style.display = 'none';
        }
        gameLinksContainerP.style.display = 'none';
        gameListUl.style.display = 'block';
    } else {
        profileSetupDiv.style.display = 'block';
        userInfoContainer.style.display = 'none';
        if (userProfile) {
            preferredNameInput.value = userProfile.preferredName || '';
            firstNameInput.value = userProfile.firstName || '';
            usernameInput.value = userProfile.username || '';
        }
        if (!preferredNameInput.value && firebaseUser.displayName) {
             preferredNameInput.value = firebaseUser.displayName.split(' ')[0] || firebaseUser.displayName;
        }
        if (!firstNameInput.value && firebaseUser.displayName && firebaseUser.displayName.includes(' ')) {
            firstNameInput.value = firebaseUser.displayName.split(' ')[0] || '';
        }
        gameLinksContainerP.textContent = 'Please complete your profile to see available games.';
        gameLinksContainerP.style.display = 'block';
        gameListUl.style.display = 'none';
    }
}

// --- Client-side bad word check (optional, for quick UX) ---
function clientSideContainsBadWord(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return CLIENT_SIDE_BAD_WORDS.some(word => lowerText.includes(word));
}

// --- Uniqueness Checker (remains the same) ---
async function isUsernameUnique(username, currentUid) {
    const lowerUsername = username.toLowerCase();
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username_lowercase", "==", lowerUsername));
    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return true;
        for (const docSnap of querySnapshot.docs) {
            if (docSnap.id !== currentUid) return false;
        }
        return true;
    } catch (error) {
        console.error("Error checking username uniqueness:", error);
        profileErrorP.textContent = "Error checking username. Please try again.";
        profileErrorP.style.display = 'block';
        return false;
    }
}

// --- Profile Setup Logic (MODIFIED) ---
saveProfileBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        profileErrorP.textContent = "You must be logged in.";
        profileErrorP.style.display = 'block';
        return;
    }

    const preferredName = preferredNameInput.value.trim();
    const firstName = firstNameInput.value.trim();
    const username = usernameInput.value.trim();
    const usernameLower = username.toLowerCase();

    profileErrorP.style.display = 'none';

    // 1. Basic Client-Side Validations
    if (!preferredName) {
        profileErrorP.textContent = "Preferred name cannot be empty.";
        profileErrorP.style.display = 'block';
        preferredNameInput.focus();
        return;
    }
    // Basic username format check (length, characters) - server will also check
    if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        profileErrorP.textContent = "Public username must be 3-20 characters (letters, numbers, underscores).";
        profileErrorP.style.display = 'block';
        usernameInput.focus();
        return;
    }
    // Optional: Quick client-side bad word check for immediate feedback
    if (clientSideContainsBadWord(username)) {
        profileErrorP.textContent = "Username might contain inappropriate words (client check). Please choose another.";
        profileErrorP.style.display = 'block';
        usernameInput.focus();
        return;
    }
    
    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = "Validating...";

    // 2. Server-Side Username Validation (Profanity and other checks)
    try {
        const validationResult = await validateUsernameFunction({ username: username });
        if (!validationResult.data.isClean) {
            profileErrorP.textContent = validationResult.data.message || "Username is not allowed by server.";
            profileErrorP.style.display = 'block';
            usernameInput.focus();
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "Save Profile";
            return;
        }
    } catch (error) {
        console.error("Error calling validateUsername function:", error);
        profileErrorP.textContent = error.message || "Error validating username with server. Please try again.";
        profileErrorP.style.display = 'block';
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save Profile";
        return;
    }

    // 3. Check Uniqueness
    saveProfileBtn.textContent = "Checking uniqueness...";
    const unique = await isUsernameUnique(username, user.uid);
    if (!unique) {
        profileErrorP.textContent = "This public username is already taken. Please choose another.";
        profileErrorP.style.display = 'block';
        usernameInput.focus();
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save Profile";
        return;
    }

    // 4. Save to Firestore
    saveProfileBtn.textContent = "Saving...";
    try {
        const userRef = doc(db, "users", user.uid);
        const profileData = {
            preferredName: preferredName,
            firstName: firstName || null,
            username: username, // Store the validated username
            username_lowercase: usernameLower,
            profileCompletedAt: serverTimestamp()
        };
        
        await setDoc(userRef, profileData, { merge: true });
        console.log("Profile saved successfully!");
        await refreshUserProfileDisplay(user);

    } catch (error) {
        console.error("Error saving profile:", error);
        profileErrorP.textContent = "Error saving profile. Please try again.";
        profileErrorP.style.display = 'block';
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save Profile";
    }
});

// Firestore Security Rules note remains the same