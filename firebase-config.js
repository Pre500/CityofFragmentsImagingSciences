// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2HT-n41I_FSNYY4zoAceN94JNZHpQEpc",
  authDomain: "cityoffragments.firebaseapp.com",
  projectId: "cityoffragments",
  storageBucket: "cityoffragments.firebasestorage.app",
  messagingSenderId: "231471667700",
  appId: "1:231471667700:web:65654a80170919a6be01a1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const db = firebase.firestore();
const storage = firebase.storage();
