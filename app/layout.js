import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from '../components/navbar';
import { FirebaseAuthProvider } from '@/contexts/FirebaseAuthContext';
import { AuthProvider } from '@/context/AuthContext';
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Velvet",
  description: "Book tables at the finest bars, clubs, and hotel restaurants — on an interactive 3D floorplan.",
  other: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.googleapis.com https://*.gstatic.com https://static.line-scdn.net https://d.line-scdn.net https://js.stripe.com; style-src 'self' 'unsafe-inline' https://*.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://*.gstatic.com; connect-src 'self' https: wss: https://api.stripe.com https://*.stripe.com; frame-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://js.stripe.com https://*.stripe.com; child-src 'self' https://js.stripe.com https://*.stripe.com;"
  }
};

export default function RootLayout({ children }) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="en">
      <body className={inter.className}>
        {googleMapsApiKey ? (
          <Script
            id="google-maps"
            strategy="beforeInteractive"
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
          />
        ) : null}
        <AuthProvider>
          <FirebaseAuthProvider>
            <GoogleMapsProvider>
              {children}
              <Toaster position="bottom-center" />
            </GoogleMapsProvider>
          </FirebaseAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
