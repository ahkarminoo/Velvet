"use client";

import { createContext, useContext } from 'react';
import { useAuth } from '@/context/AuthContext';

const FirebaseAuthContext = createContext();

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

export const FirebaseAuthProvider = ({ children }) => {
  const {
    user,
    loading,
    logout,
    getAuthToken: getLineAuthToken,
    refreshUser,
    refetchUser
  } = useAuth();

  const getAuthToken = async () => getLineAuthToken();
  const refreshUserProfile = refreshUser || refetchUser;

  const value = {
    user,
    userProfile: user,
    loading,
    logout,
    getAuthToken,
    refreshUserProfile,
    isAuthenticated: !!user,
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}; 
