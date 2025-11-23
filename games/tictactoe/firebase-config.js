// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBY17UIfSvvTFSkKL8IS9hcY_WWc-USVno",
  authDomain: "sprowbaseb.firebaseapp.com",
  projectId: "sprowbaseb",
  storageBucket: "sprowbaseb.firebasestorage.app",
  messagingSenderId: "919402588996",
  appId: "1:919402588996:web:f5071422b6d79a1cbf4511"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = app.firestore();
