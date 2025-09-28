
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useMemo, useCallback, useState, useEffect, useContext } from 'react';
import { useSettings } from './settings-context';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, writeBatch, runTransaction } from 'firebase/firestore';

// Define the Transaction and Customer interfaces
export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amountUSD: number;
  items?: {
    productId: string;
    name: string;
    quantity: number;
    priceUSD: number;
  }[];
}

export interface Customer {
  id: string;
  debtId: string;
  name: string;
  phone?: string;
  location?: string;
  totalDebtUSD: number;
  customerSince: string;
  transactions: Transaction[];
  dueDate?: string;
  isPinned?: boolean;
}

const initialCustomers: Customer[] = [
  {
    id: 'C001',
    debtId: 'D001',
    name: 'Ahmed Ali (متأخر جداً)',
    phone: '07712345678',
    location: 'Baghdad, Karrada',
    totalDebtUSD: 1500,
    customerSince: '2023-01-15T10:00:00.000Z',
    dueDate: '2023-08-01', // Very overdue
    isPinned: true,
    transactions: [
      {
        id: 'T001',
        date: '2023-01-15T10:00:00.000Z',
        description: 'Initial large purchase',
        type: 'DEBIT',
        amountUSD: 1500,
        items: [
            { productId: '1', name: 'Basmati Rice (1kg)', quantity: 100, priceUSD: 2.50 },
            { productId: '5', name: 'Chicken Breast (500g)', quantity: 227.27, priceUSD: 5.50 }
        ]
      }
    ]
  },
  {
    id: 'C002',
    debtId: 'D002',
    name: 'Fatima Kadhim',
    phone: '07809876543',
    location: 'Basra, Ashar',
    totalDebtUSD: 0,
    customerSince: '2024-03-10T14:30:00.000Z',
    transactions: [
        {
            id: 'T002',
            date: '2024-03-10T14:30:00.000Z',
            description: 'Sale #S-240310',
            type: 'DEBIT',
            amountUSD: 150
        },
        {
            id: 'T003',
            date: '2024-04-01T11:00:00.000Z',
            description: 'Cash Payment',
            type: 'CREDIT',
            amountUSD: 150
        }
    ]
  },
  {
    id: 'C003',
    debtId: 'D003',
    name: 'Zainab Mahmoud',
    phone: '07901122334',
    location: 'Erbil, Ankawa',
    totalDebtUSD: 75.50,
    customerSince: '2024-06-20T09:00:00.000Z',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0], // Due in 15 days
    transactions: [
        {
            id: 'T004',
            date: '2024-06-20T09:00:00.000Z',
            description: 'Sale #S-240620',
            type: 'DEBIT',
            amountUSD: 75.50
        }
    ]
  }
];


// --- Context Definitions ---
interface CustomerDataContextType {
  customers: Customer[];
  isLoading: boolean;
}
const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);


interface CustomerActionsContextType {
  addCustomer: (newCustomerData: { name: string; phone: string; location: string }) => Promise<Customer>;
  updateCustomer: (customerId: string, data: Partial<Omit<Customer, 'id'>>) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  deleteTransaction: (customer: Customer, transactionId: string) => Promise<void>;
}

const CustomerActionsContext = createContext<CustomerActionsContextType | undefined>(undefined);

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const { activeBranch, isInitialized: isSettingsInitialized } = useSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!isSettingsInitialized || !activeBranch) {
      return;
    }

    const branchId = activeBranch.id;
    const cacheKey = `customers_${branchId}`;
    
    // Set loading to true only if there's no cached data
    const cachedCustomers = localStorage.getItem(cacheKey);
    if (!cachedCustomers) {
      setIsLoading(true);
    } else {
       try {
        setCustomers(JSON.parse(cachedCustomers));
        setIsLoading(false); 
      } catch (e) {
        setIsLoading(true);
      }
    }
    
    if (!isFirebaseConfigured || !db) {
        if (!cachedCustomers) {
            setCustomers(initialCustomers);
            localStorage.setItem(cacheKey, JSON.stringify(initialCustomers));
        }
        setIsLoading(false);
        return;
    }

    // If Firebase is configured, set up the real-time listener.
    const customersCollectionRef = collection(db, `branches/${branchId}/customers`);
    const q = query(customersCollectionRef, orderBy("customerSince", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        // Seeding logic for 'main' branch on first run
        if (branchId === 'main' && snapshot.empty) {
            console.log("Seeding initial customers for 'main' branch...");
            const batch = writeBatch(db);
            initialCustomers.forEach(customer => {
                const { id, ...customerData } = customer;
                const docRef = doc(db, `branches/main/customers`, id);
                batch.set(docRef, customerData);
            });
            batch.commit();
            // The listener will be re-triggered with the new data.
        } else {
            const customersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
            setCustomers(customersData);
            localStorage.setItem(cacheKey, JSON.stringify(customersData));
        }
        setIsLoading(false); // Data has been loaded from Firebase
    }, (error) => {
        console.error("Error fetching real-time customers:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeBranch, isSettingsInitialized]);

  const addCustomer = useCallback(async (newCustomerData: { name: string; phone: string; location: string }): Promise<Customer> => {
    const branchId = activeBranch?.id;
    if (!branchId) {
        throw new Error("Active branch not found");
    }
    
    const newCustomer: Customer = {
        id: `local-${Date.now()}`,
        debtId: `D${Date.now()}`,
        name: newCustomerData.name,
        phone: newCustomerData.phone || '',
        location: newCustomerData.location || '',
        totalDebtUSD: 0,
        customerSince: new Date().toISOString(),
        transactions: [],
    };

    // Update state and localStorage for offline mode
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    localStorage.setItem(`customers_${branchId}`, JSON.stringify(updatedCustomers));


    // Sync with Firebase in the background
    if (isFirebaseConfigured && db) {
        try {
            const { id, ...dbData } = newCustomer; // Exclude temp id
            const newDocRef = await addDoc(collection(db, `branches/${branchId}/customers`), dbData);
            
            // Update the UI with the real ID from Firestore
            setCustomers(prev => prev.map(c => c.id === newCustomer.id ? { ...c, id: newDocRef.id } : c));
            return { ...newCustomer, id: newDocRef.id };
        } catch (error) {
            console.error("Failed to add customer to Firestore:", error);
            // Revert optimistic update on failure
            setCustomers(prev => prev.filter(c => c.id !== newCustomer.id));
            throw error; // Re-throw error to be caught by caller
        }
    }
    
    return newCustomer;
  }, [activeBranch?.id, customers]);
  
  const updateCustomer = useCallback(async (customerId: string, data: Partial<Omit<Customer, 'id'>>) => {
    const branchId = activeBranch?.id;
    if (!branchId || Object.keys(data).length === 0) return;
    
    setCustomers(prev => {
        const updated = prev.map(c => 
            c.id === customerId ? { ...c, ...data } as Customer : c
        );
        localStorage.setItem(`customers_${branchId}`, JSON.stringify(updated));
        return updated;
    });

    // Fallback for offline mode or when Firebase is not configured
    if (!isFirebaseConfigured || !db) {
        return;
    }

    const customerDocRef = doc(db, `branches/${branchId}/customers`, customerId);
    await updateDoc(customerDocRef, data);
  }, [activeBranch?.id]);

  const deleteCustomer = useCallback(async (customerId: string) => {
    const branchId = activeBranch?.id;
    if (!branchId) return;

    setCustomers(prev => {
      const updated = prev.filter(c => c.id !== customerId);
      localStorage.setItem(`customers_${branchId}`, JSON.stringify(updated));
      return updated;
    });

    if (!isFirebaseConfigured || !db) {
      return;
    }

    const customerDocRef = doc(db, `branches/${branchId}/customers`, customerId);
    await deleteDoc(customerDocRef);
  }, [activeBranch?.id]);
  
  const deleteTransaction = useCallback(async (customer: Customer, transactionId: string) => {
    if (!customer) return;

    const newTransactions = customer.transactions.filter(tx => tx.id !== transactionId);
    const newTotalDebtUSD = newTransactions.reduce((acc, tx) => {
        return tx.type === 'DEBIT' ? acc + tx.amountUSD : acc - tx.amountUSD;
    }, 0);
    
    const updatedData = {
        transactions: newTransactions,
        totalDebtUSD: parseFloat(newTotalDebtUSD.toFixed(2))
    };

    await updateCustomer(customer.id, updatedData);
  }, [updateCustomer]);

  const dataValue = useMemo(() => ({ customers, isLoading }), [customers, isLoading]);
  const actionsValue = useMemo(() => ({ addCustomer, updateCustomer, deleteCustomer, deleteTransaction }), [addCustomer, updateCustomer, deleteCustomer, deleteTransaction]);

  return (
    <CustomerDataContext.Provider value={dataValue}>
      <CustomerActionsContext.Provider value={actionsValue}>
        {children}
      </CustomerActionsContext.Provider>
    </CustomerDataContext.Provider>
  );
};


// --- Custom Hooks ---
export const useCustomerData = (): CustomerDataContextType => {
  const context = useContext(CustomerDataContext);
  if (context === undefined) {
    throw new Error('useCustomerData must be used within a CustomerProvider');
  }
  return context;
};

export const useCustomerActions = (): CustomerActionsContextType => {
  const context = useContext(CustomerActionsContext);
  if (context === undefined) {
    throw new Error('useCustomerActions must be used within a CustomerProvider');
  }
  return context;
};

    