// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// Only import analytics if needed
// import { getAnalytics, isSupported } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCawMYzcVRSl1Yc4yk4aRKaOFQsgxwhDZw",
  authDomain: "foodloft-450813.firebaseapp.com",
  projectId: "foodloft-450813",
  storageBucket: "foodloft-450813.firebasestorage.app",
  messagingSenderId: "8952613263",
  appId: "1:8952613263:web:380275571aacce9d6ea3fa",
  measurementId: "G-SPHTWXKXTK"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Only initialize analytics in the browser and if supported
// let analytics = null;
// if (typeof window !== "undefined") {
//   isSupported().then((supported) => {
//     if (supported) {
//       analytics = getAnalytics(app);
//     }
//   });
// }

export { auth };