// Your web app's Firebase configuration
// IMPORTANT: Replace placeholders with your actual Firebase config values!
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Replace with your actual API Key
  authDomain: "YOUR_AUTH_DOMAIN", // e.g., your-project-id.firebaseapp.com
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET", // e.g., your-project-id.appspot.com
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// Initialize Firebase
// Use compat version for easier integration with existing script structure
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); // Get the auth service

// Optional: Initialize Analytics if measurementId is provided
// if (firebaseConfig.measurementId) {
//   const analytics = firebase.analytics();
// }

console.log("Firebase initialized."); 