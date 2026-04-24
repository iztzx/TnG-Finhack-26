import React, { createContext, useState, useEffect, useContext } from 'react';
import { signIn, signUp, signOut, getCurrentUser } from 'aws-amplify/auth';
import { get, post } from 'aws-amplify/api';
import awsconfig from '../aws-exports';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if we are running the local mock without real AWS backend
  const isDemoMode = awsconfig.aws_user_pools_id === 'ap-southeast-1_XXXXX';

  const clearError = () => setError(null);

  const isAdmin = userProfile?.role === 'admin';

  const fetchProfile = async (userId) => {
    if (isDemoMode) return { role: 'user', email: 'demo@pantasflow.com' };
    
    try {
      const restOperation = get({ 
        apiName: 'PantasFlowAPI', 
        path: `/users/${userId}` 
      });
      const { body } = await restOperation.response;
      const data = await body.json();
      return data;
    } catch (err) {
      console.error('[PantasFlow Auth] Failed to fetch profile', err);
      return null;
    }
  };

  const checkSession = async () => {
    setIsLoading(true);
    try {
      if (isDemoMode) {
        // Mock session check
        const demoUser = localStorage.getItem('demoUser');
        if (demoUser) {
          const parsed = JSON.parse(demoUser);
          setUser(parsed.user);
          setUserProfile(parsed.profile);
        }
        setIsLoading(false);
        return;
      }

      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      const profile = await fetchProfile(currentUser.userId);
      if (profile) {
        setUserProfile(profile);
      }
    } catch (err) {
      // User is not signed in
      setUser(null);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email, password) => {
    clearError();
    setIsLoading(true);
    try {
      if (isDemoMode) {
        // DEMO MODE LOGIN
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (password === 'wrong') {
              setError("Incorrect password. Please try again.");
              setIsLoading(false);
              reject(new Error("Incorrect password"));
              return;
            }
            
            const isAdm = email === 'admin@pantasflow.com';
            const mockUser = { userId: isAdm ? 'admin-123' : 'user-123', username: email };
            const mockProfile = { role: isAdm ? 'admin' : 'user', email };
            
            setUser(mockUser);
            setUserProfile(mockProfile);
            localStorage.setItem('demoUser', JSON.stringify({ user: mockUser, profile: mockProfile }));
            setIsLoading(false);
            resolve(mockProfile.role);
          }, 1000);
        });
      }

      const { isSignedIn } = await signIn({ username: email, password });
      
      if (isSignedIn) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        let profile = null;
        if (email === 'admin@pantasflow.com') {
          profile = { role: 'admin', email: 'admin@pantasflow.com', userId: currentUser.userId };
          setUserProfile(profile);
        } else {
          profile = await fetchProfile(currentUser.userId);
          setUserProfile(profile);
        }
        
        return profile?.role || 'user';
      }
    } catch (err) {
      console.error('[PantasFlow Auth]', err);
      let message = "Something went wrong. Please try again.";
      if (err.name === 'UserNotFoundException') message = "No account found with this email address.";
      if (err.name === 'NotAuthorizedException') message = "Incorrect password. Please try again.";
      if (err.name === 'UserNotConfirmedException') message = "Please verify your email before signing in.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (formData) => {
    clearError();
    setIsLoading(true);
    try {
      const { email, password, phone_number, companyName, registrationNo, businessType } = formData;
      
      if (isDemoMode) {
        // DEMO MODE REGISTER
        return new Promise((resolve) => {
          setTimeout(() => {
            const newProfile = {
              userId: 'demo-new-user-123',
              email, companyName, registrationNo,
              phoneNumber: phone_number, businessType,
              role: 'user', riskTier: 'tier2', kycStatus: 'pending',
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            const mockUser = { userId: newProfile.userId, username: email };
            
            setUser(mockUser);
            setUserProfile(newProfile);
            localStorage.setItem('demoUser', JSON.stringify({ user: mockUser, profile: newProfile }));
            setIsLoading(false);
            resolve(newProfile);
          }, 1500);
        });
      }

      const { userId } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            phone_number
          }
        }
      });

      const newProfile = {
        userId,
        email,
        companyName,
        registrationNo,
        phoneNumber: phone_number,
        businessType,
        role: 'user',
        riskTier: 'tier2',
        kycStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const restOperation = post({
        apiName: 'PantasFlowAPI',
        path: '/users',
        options: { body: newProfile }
      });
      await restOperation.response;
      
      await signIn({ username: email, password });
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setUserProfile(newProfile);
      
      return newProfile;
    } catch (err) {
      console.error('[PantasFlow Auth]', err);
      let message = "Something went wrong. Please try again.";
      if (err.name === 'UsernameExistsException') message = "An account with this email already exists. Please sign in instead.";
      if (err.name === 'InvalidPasswordException') message = "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isDemoMode) {
        localStorage.removeItem('demoUser');
        setUser(null);
        setUserProfile(null);
        setIsLoading(false);
        return;
      }
      
      await signOut();
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('[PantasFlow Auth]', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isLoading,
      isAdmin,
      login,
      register,
      logout,
      error,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};
