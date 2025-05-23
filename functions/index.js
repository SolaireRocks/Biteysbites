// functions/index.js
const functions = require("firebase-functions");
const Filter = require("bad-words");
const filter = new Filter();

// Optional: Add your own custom bad words or adjust the filter
// filter.addWords('somecustombadword', 'anotherone');
// You can also remove words from the default list if needed:
// filter.removeWords('hell'); // Example if 'hell' is too restrictive

exports.validateUsername = functions.https.onCall(async (data, context) => {
  // 1. Check if the user is authenticated (recommended)
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const username = data.username;

  // 2. Basic input validation
  if (!(typeof username === "string") || username.length === 0) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Username argument must be a non-empty string.", // Shortened this line
    );
  }

  if (username.length < 3 || username.length > 20) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Username must be between 3 and 20 characters.",
    );
  }

  // Regex for allowed characters (same as client-side)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Username can only contain letters, numbers, and underscores.",
    );
  }

  // 3. Perform the profanity check
  let isClean = true;
  let message = "Username is clean.";

  try {
    if (filter.isProfane(username)) {
      isClean = false;
      message = "Username contains prohibited words.";
    }
  } catch (error) {
    console.error(
        "Profanity check error for username:", // Shortened
        username,
        error,
    );
    // The library might throw if input is very unexpected.
    throw new functions.https.HttpsError(
        "internal",
        "Error processing username for profanity.",
    );
  }

  // 4. Return the result
  return {
    isClean: isClean,
    message: message,
    username: username,
  };
});
