

'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, doc, onSnapshot, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { useUser } from './user-context';


export interface Branch {
  id: string;
  name: string;
  contact: string;
}

export interface NotificationSettings {
  lowStockAlerts: boolean;
  debtReminders: boolean;
  updatesEmail: string;
}

export interface InvoiceSettings {
  template: 'standard' | 'compact';
  logoUrl: string;
  logoSize: 'small' | 'medium' | 'large';
  showCustomerPhone: boolean;
  showBranchContact: boolean;
  showDiscount: boolean;
  showRemainingDebt: boolean;
  fontFamily: string;
  primaryColor: string;
  headerBackgroundColor: string;
  headerTextColor: string;
  tableHeaderBackgroundColor: string;
  tableHeaderTextColor: string;
  tableEvenRowBackgroundColor: string;
  tableOddRowBackgroundColor: string;
  tableTextColor: string;
  totalsSectionBackgroundColor: string;
  totalsSectionTextColor: string;
  borderColor: string;
  footerText: string;
  footerFontSize: string;
  footerAlign: 'left' | 'center' | 'right';
}

const defaultMainBranch: Branch = { id: 'main', name: 'Rawnak Sales - Main Branch', contact: '+964 770 123 4567' };

const defaultNotificationSettings: NotificationSettings = {
  lowStockAlerts: true,
  debtReminders: false,
  updatesEmail: 'owner@rawnak.com',
};

const defaultInvoiceSettings: InvoiceSettings = {
  template: 'standard',
  logoUrl: '',
  logoSize: 'medium',
  showCustomerPhone: true,
  showBranchContact: true,
  showDiscount: true,
  showRemainingDebt: true,
  fontFamily: 'font-body', // Use CSS variable name
  primaryColor: '#000000',
  headerBackgroundColor: '#F3F4F6',
  headerTextColor: '#111827',
  tableHeaderBackgroundColor: '#E5E7EB',
  tableHeaderTextColor: '#1F2937',
  tableEvenRowBackgroundColor: '#FFFFFF',
  tableOddRowBackgroundColor: '#F9FAFB',
  tableTextColor: '#374151',
  totalsSectionBackgroundColor: '#F3F4F6',
  totalsSectionTextColor: '#111827',
  borderColor: '#D1D5DB',
  footerText: 'Thank you for your business!\nشكراً لتعاملكم معنا!',
  footerFontSize: '10px',
  footerAlign: 'center',
};


interface SettingsContextType {
  activeBranch: Branch | null;
  branches: Branch[];
  notificationSettings: NotificationSettings;
  invoiceSettings: InvoiceSettings;
  isInitialized: boolean;
  switchBranch: (branchId: string) => void;
  addBranch: (branchName: string) => Promise<Branch>;
  updateActiveBranchInfo: (newInfo: Partial<Omit<Branch, 'id'>>) => Promise<void>;
  updateNotificationSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  updateInvoiceSettings: (newSettings: Partial<InvoiceSettings>) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('main');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(defaultInvoiceSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // This effect handles the initial loading of branch information and settings.
    let unsubscribe: (() => void) | null = null;

    const initialize = () => {
        // Load last active branch from localStorage to persist selection
        const lastActiveBranchId = localStorage.getItem('activeBranchId');
        if (lastActiveBranchId) {
            try {
                setActiveBranchId(JSON.parse(lastActiveBranchId));
            } catch(e) {
                setActiveBranchId('main');
            }
        }
        
        if (!isFirebaseConfigured || !db) {
            // Offline/Demo mode
            setBranches([defaultMainBranch]);
            setIsInitialized(true);
            return;
        }

        // Online mode: Listen to branches collection
        const branchesCollectionRef = collection(db, 'branches');
        unsubscribe = onSnapshot(branchesCollectionRef, (snapshot) => {
            if (snapshot.empty) {
                // If no branches exist, create the main one
                setDoc(doc(db, 'branches', 'main'), defaultMainBranch);
                setBranches([defaultMainBranch]);
            } else {
                const branchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
                setBranches(branchesData);
            }
            // Signal that the settings provider is ready
            if (!isInitialized) {
                setIsInitialized(true);
            }
        }, (error) => {
            console.error("Error fetching branches:", error);
            // Even on error, we should initialize to unblock the app
            if (!isInitialized) {
                setIsInitialized(true);
            }
        });
    };
    
    initialize();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isInitialized]); // Depend on isInitialized to prevent re-running after initialization.

  useEffect(() => {
    // This effect listens for settings changes for the currently active branch.
    // It should only run after the initial setup is complete.
    if (!activeBranchId || !isInitialized) return;
    
    let unsubscribeSettings: (() => void) | null = null;
    
    if (!isFirebaseConfigured || !db) {
        setNotificationSettings(defaultNotificationSettings);
        setInvoiceSettings(defaultInvoiceSettings);
        return;
    }

    const settingsDocRef = doc(db, `branches/${activeBranchId}/data`, 'settings');
    unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setNotificationSettings(data.notificationSettings || defaultNotificationSettings);
            setInvoiceSettings({ ...defaultInvoiceSettings, ...data.invoiceSettings });
        } else {
            // Create default settings if they don't exist for this branch
            setDoc(settingsDocRef, { 
                notificationSettings: defaultNotificationSettings,
                invoiceSettings: defaultInvoiceSettings
            });
            setNotificationSettings(defaultNotificationSettings);
            setInvoiceSettings(defaultInvoiceSettings);
        }
    });

    return () => {
      if (unsubscribeSettings) {
        unsubscribeSettings();
      }
    };
  }, [activeBranchId, isInitialized]);
  
  const switchBranch = useCallback((branchId: string) => {
    setActiveBranchId(branchId);
    localStorage.setItem('activeBranchId', JSON.stringify(branchId));
  }, []);

  const addBranch = useCallback(async (branchName: string): Promise<Branch> => {
    const trimmedName = branchName.trim();
    if (!trimmedName) {
        throw new Error("Branch name cannot be empty.");
    }

    if (!isFirebaseConfigured || !db) {
        const newBranch: Branch = { id: `local-${Date.now()}`, name: trimmedName, contact: '' };
        setBranches(prevBranches => [...prevBranches, newBranch]);
        switchBranch(newBranch.id);
        return newBranch;
    }

    const newBranchRef = doc(collection(db, 'branches'));
    const newBranch: Branch = { id: newBranchRef.id, name: trimmedName, contact: '' };
    await setDoc(newBranchRef, newBranch);
    switchBranch(newBranch.id);
    return newBranch;
  }, [switchBranch]);
  
  const updateActiveBranchInfo = useCallback(async (newInfo: Partial<Omit<Branch, 'id'>>) => {
     if (!activeBranchId) return;

    if (!isFirebaseConfigured || !db) {
        setBranches(prevBranches => prevBranches.map(b => b.id === activeBranchId ? { ...b, ...newInfo } as Branch : b));
        return;
    }
    
    const branchDocRef = doc(db, 'branches', activeBranchId);
    await updateDoc(branchDocRef, newInfo);
  }, [activeBranchId]);


  const updateNotificationSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!activeBranchId) return;
    
    if (!isFirebaseConfigured || !db) {
        setNotificationSettings(prevSettings => ({...prevSettings, ...newSettings}));
        return;
    }
    
    const settingsDocRef = doc(db, `branches/${activeBranchId}/data`, 'settings');
    const newSettingsData = { ...notificationSettings, ...newSettings };
    await setDoc(settingsDocRef, { notificationSettings: newSettingsData }, { merge: true });
  }, [activeBranchId, notificationSettings]);
  
  const updateInvoiceSettings = useCallback(async (newSettings: Partial<InvoiceSettings>) => {
    if (!activeBranchId) return;

    if (!isFirebaseConfigured || !db) {
        setInvoiceSettings(prevSettings => ({...prevSettings, ...newSettings}));
        return;
    }
    
    const settingsDocRef = doc(db, `branches/${activeBranchId}/data`, 'settings');
    // Using a non-destructive merge to ensure all keys are preserved
    const updatedSettings = { ...invoiceSettings, ...newSettings };
    await setDoc(settingsDocRef, { invoiceSettings: updatedSettings }, { merge: true });
  }, [activeBranchId, invoiceSettings]);
  
  const deleteBranch = useCallback(async (branchId: string): Promise<void> => {
    if (currentUser?.role !== 'Admin') throw new Error("permission_denied");

    if (branchId === 'main') {
        // This is a highly destructive action and should be used with caution.
        localStorage.clear();
        if (isFirebaseConfigured && db) {
            // For a real-world app, you might want to archive data instead.
            // Here, we just delete the document, which will trigger a re-seed if the logic is in place.
            await deleteDoc(doc(db, 'branches', 'main'));
        }
        // A full page reload is necessary to re-initialize the app state from scratch.
        window.location.reload();
        return;
    }


    if (!isFirebaseConfigured || !db) {
        setBranches(prev => prev.filter(b => b.id !== branchId));
        if (activeBranchId === branchId) {
            switchBranch('main');
        }
        return;
    }
    
    const branchDocRef = doc(db, 'branches', branchId);
    await deleteDoc(branchDocRef);
    
    if (activeBranchId === branchId) {
      switchBranch('main');
    }
  }, [currentUser, activeBranchId, switchBranch]);

  const activeBranch = useMemo(() => branches.find(b => b.id === activeBranchId) || null, [branches, activeBranchId]);

  const value = useMemo(() => ({
    activeBranch,
    branches,
    notificationSettings,
    invoiceSettings,
    isInitialized,
    switchBranch,
    addBranch,
    updateActiveBranchInfo,
    updateNotificationSettings,
    updateInvoiceSettings,
    deleteBranch,
  }), [
    activeBranch,
    branches,
    notificationSettings,
    invoiceSettings,
    isInitialized,
    switchBranch,
    addBranch,
    updateActiveBranchInfo,
    updateNotificationSettings,
    updateInvoiceSettings,
    deleteBranch,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

  

    