import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile,
    AuthError
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<User>;
    signup: (email: string, password: string, displayName?: string) => Promise<User>;
    loginWithGoogle: () => Promise<User>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps Firebase Auth error codes to executive user-friendly messages.
 */
export const formatAuthError = (error: unknown): string => {
    if (!error) return 'An unexpected authentication error occurred.';
    const authError = error as AuthError;
    const code = authError.code || '';

    switch (code) {
        case 'auth/invalid-email':
            return 'The email address provided is invalid. Please check the format.';
        case 'auth/user-disabled':
            return 'This executive account has been disabled. Please contact support.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please verify your credentials.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists. Please sign in instead.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use at least 6 characters.';
        case 'auth/popup-closed-by-user':
            return 'Google authentication was cancelled by closing the window.';
        case 'auth/popup-blocked':
            return 'Authentication popup was blocked by your browser. Please allow popups.';
        case 'auth/network-request-failed':
            return 'Network error encountered. Please check your internet connection.';
        case 'auth/too-many-requests':
            return 'Access temporarily disabled due to unusual activity. Try again later.';
        default:
            return authError.message || 'An error occurred during authentication.';
    }
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Synchronize auth state persistence with Firebase
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                setCurrentUser(user);
                setLoading(false);
            },
            (err) => {
                console.error('Firebase Auth state listener error:', err);
                setError(formatAuthError(err));
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const clearError = () => {
        setError(null);
    };

    const login = async (email: string, password: string): Promise<User> => {
        setLoading(true);
        setError(null);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            setCurrentUser(userCredential.user);
            return userCredential.user;
        } catch (err: unknown) {
            const msg = formatAuthError(err);
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    const signup = async (email: string, password: string, displayName?: string): Promise<User> => {
        setLoading(true);
        setError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (displayName && displayName.trim()) {
                await updateProfile(userCredential.user, {
                    displayName: displayName.trim()
                });
            }
            setCurrentUser(userCredential.user);
            return userCredential.user;
        } catch (err: unknown) {
            const msg = formatAuthError(err);
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async (): Promise<User> => {
        setLoading(true);
        setError(null);
        try {
            const userCredential = await signInWithPopup(auth, googleProvider);
            setCurrentUser(userCredential.user);
            return userCredential.user;
        } catch (err: unknown) {
            const msg = formatAuthError(err);
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    const logout = async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            await signOut(auth);
            setCurrentUser(null);
        } catch (err: unknown) {
            const msg = formatAuthError(err);
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    const value: AuthContextType = {
        currentUser,
        loading,
        error,
        login,
        signup,
        loginWithGoogle,
        logout,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
