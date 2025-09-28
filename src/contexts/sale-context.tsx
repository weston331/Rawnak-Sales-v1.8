
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useMemo, useCallback, useState, useEffect, useContext } from 'react';
import { useSettings } from './settings-context';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, setDoc, query, orderBy, writeBatch, runTransaction, getDoc } from 'firebase/firestore';
import type { Customer, Transaction } from './customer-context';
import { useProductData, useProductActions, type Product } from './product-context';
import { useCustomerActions } from './customer-context';


export interface SaleItem {
  productId: string;
  name: string;
  priceUSD: number; 
  quantity: number;
  purchasePriceUSD?: number; // Cost of the item/service
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerLocation?: string | null;
  totalUSD: number;
  status: 'Paid' | 'Debt' | 'Partial';
  amountPaidUSD?: number;
  items: SaleItem[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmountUSD?: number;
}

// --- Context Definitions ---

interface SaleDataContextType {
    sales: Sale[];
    isLoading: boolean;
}
const SaleDataContext = createContext<SaleDataContextType | undefined>(undefined);


interface RecordSaleTransactionData {
    cart: SaleItem[];
    customer: Customer;
    totalUSD: number;
    paymentMethod: 'paid' | 'debt' | 'partial';
    partialAmountPaidUSD?: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountAmountUSD?: number;
}
interface SaleActionsContextType {
  recordNewSaleTransaction: (data: RecordSaleTransactionData) => Promise<Sale>;
}

const SaleActionsContext = React.createContext<SaleActionsContextType | undefined>(undefined);

export const SaleProvider = ({ children }: { children: ReactNode }) => {
  const { activeBranch, isInitialized: isSettingsInitialized } = useSettings();
  const { products } = useProductData();
  const { updateProduct } = useProductActions();
  const { updateCustomer } = useCustomerActions();

  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSettingsInitialized || !activeBranch) {
        return;
    }

    setIsLoading(true);
    const branchId = activeBranch.id;
    const cacheKey = `sales_${branchId}`;
    
    // Fallback for non-Firebase environment
    if (!isFirebaseConfigured || !db) {
        console.log("Firebase not configured. Using local data for sales.");
        try {
            const cachedData = localStorage.getItem(cacheKey);
            setSales(cachedData ? JSON.parse(cachedData) : []);
        } catch (e) {
            setSales([]);
        }
        setIsLoading(false);
        return;
    }

    // Firebase is configured, set up the real-time listener.
    const salesQuery = query(collection(db, `branches/${branchId}/sales`), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
        const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
        setSales(salesData);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(salesData));
        } catch (e) {
            console.error("Failed to cache sales data", e);
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time sales:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeBranch, isSettingsInitialized]);


  const recordNewSaleTransaction = useCallback(async (data: RecordSaleTransactionData): Promise<Sale> => {
    const { cart, customer, totalUSD, paymentMethod, partialAmountPaidUSD, ...discountInfo } = data;

    const branchId = activeBranch?.id;
    if (!branchId) throw new Error("Active branch not found");
    
    // Enrich cart items with purchase price for accurate profit calculation later
    const productMap = products.reduce((map, p) => {
        map[p.id] = p;
        return map;
    }, {} as Record<string, Product>);

    const enrichedCart = cart.map(item => {
        if (item.productId.startsWith('custom-')) {
            return item; // Custom items already have purchasePriceUSD
        }
        const product = productMap[item.productId];
        return {
            ...item,
            purchasePriceUSD: product?.purchasePriceUSD ?? 0 // Default to 0 if not found
        };
    });


    const getStatus = (): Sale['status'] => {
        if (paymentMethod === 'paid') return 'Paid';
        if (paymentMethod === 'debt') return 'Debt';
        return 'Partial';
    };

    // --- Firebase Logic ---
    if (isFirebaseConfigured && db && activeBranch) {
        const newSaleRef = doc(collection(db, `branches/${branchId}/sales`));
        let newSaleData: Omit<Sale, 'id'> | null = null;

        await runTransaction(db, async (transaction) => {
          // --- STAGE 0: Get the next invoice number ---
          const counterRef = doc(db, `branches/${branchId}/data`, 'counters');
          const counterDoc = await transaction.get(counterRef);
          
          let nextInvoiceSequence = 1;
          if (counterDoc.exists() && counterDoc.data().invoiceCounter) {
              nextInvoiceSequence = counterDoc.data().invoiceCounter + 1;
          }
          const invoiceNumber = `S-${String(Date.now()).slice(-6)}-${nextInvoiceSequence}`;

          // --- STAGE 1: READS ---
          const productItemsInCart = enrichedCart.filter(item => !item.productId.startsWith('custom-'));
          const productRefs = productItemsInCart.map(item => doc(db, `branches/${branchId}/products`, item.productId));
          const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
          
          const customerRef = doc(db, `branches/${branchId}/customers`, customer.id);
          const customerDoc = await transaction.get(customerRef);

          // --- STAGE 2: VALIDATION ---
          for (let i = 0; i < productItemsInCart.length; i++) {
            const productDocSnap = productDocs[i];
            if (!productDocSnap.exists()) {
              throw new Error(`Product ${productItemsInCart[i].name} not found.`);
            }
            if ((productDocSnap.data().stock as number) < productItemsInCart[i].quantity) {
              throw new Error(`Not enough stock for ${productItemsInCart[i].name}.`);
            }
          }
          if (!customerDoc.exists()) {
            throw new Error(`Customer with ID ${customer.id} not found!`);
          }

          // --- STAGE 3: PREPARE SALE DATA ---
           newSaleData = {
              date: new Date().toISOString(),
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone || '',
              customerLocation: customer.location || null,
              totalUSD: totalUSD,
              status: getStatus(),
              amountPaidUSD: paymentMethod === 'partial' ? partialAmountPaidUSD : (paymentMethod === 'paid' ? totalUSD : 0),
              items: enrichedCart, // Use enriched cart
              invoiceNumber,
              ...discountInfo
          };


          // --- STAGE 4: WRITES ---
          transaction.set(newSaleRef, newSaleData);
          transaction.set(counterRef, { invoiceCounter: nextInvoiceSequence }, { merge: true });

          // Update stock only for actual products
          for (let i = 0; i < productItemsInCart.length; i++) {
            const item = productItemsInCart[i];
            const productRef = productRefs[i];
            const currentStock = productDocs[i].data()?.stock || 0;
            transaction.update(productRef, { stock: currentStock - item.quantity });
          }

          // Update customer debt if the sale is not fully paid
          const debtAmount = totalUSD - (newSaleData.amountPaidUSD || 0);
          if (debtAmount > 0) {
            const currentDebt = customerDoc.data()?.totalDebtUSD || 0;
            const currentTransactions = customerDoc.data()?.transactions || [];
            
            const newDebitTransaction: Transaction = {
              id: `T${Date.now()}-D`,
              date: newSaleData.date,
              description: `Sale #${invoiceNumber}`,
              type: 'DEBIT',
              amountUSD: totalUSD,
              items: enrichedCart,
            };

            const newTransactions = [...currentTransactions, newDebitTransaction];

            if (newSaleData.amountPaidUSD && newSaleData.amountPaidUSD > 0) {
                const newCreditTransaction: Transaction = {
                    id: `T${Date.now()}-C`,
                    date: newSaleData.date,
                    description: `Down payment for sale #${invoiceNumber}`,
                    type: 'CREDIT',
                    amountUSD: newSaleData.amountPaidUSD,
                };
                newTransactions.push(newCreditTransaction);
            }
            
            transaction.update(customerRef, {
                totalDebtUSD: currentDebt + debtAmount,
                transactions: newTransactions
            });
          }
        });
        
        if (!newSaleData) {
            throw new Error("Sale data could not be prepared during transaction.");
        }

        return { id: newSaleRef.id, ...newSaleData };
    }
    
    // --- Local Storage Fallback Logic ---
     const invoiceNumber = `S-local-${String(Date.now()).slice(-6)}`;
     const newSaleData: Omit<Sale, 'id'> = {
        date: new Date().toISOString(),
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerLocation: customer.location,
        totalUSD: totalUSD,
        status: getStatus(),
        amountPaidUSD: paymentMethod === 'partial' ? partialAmountPaidUSD : (paymentMethod === 'paid' ? totalUSD : 0),
        items: enrichedCart,
        invoiceNumber,
        ...discountInfo
    };
    const newSaleRecord: Sale = { id: `local-${Date.now()}`, ...newSaleData };

    // Update sales in local state
    setSales(prevSales => {
        const updatedSales = [newSaleRecord, ...prevSales];
        localStorage.setItem(`sales_${branchId}`, JSON.stringify(updatedSales));
        return updatedSales;
    });

    // Update product stock locally
    enrichedCart.forEach(item => {
        if (!item.productId.startsWith('custom-')) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const newStock = product.stock - item.quantity;
              updateProduct(item.productId, { stock: newStock });
            }
        }
    });
    
    // Update customer debt locally
    const debtAmount = totalUSD - (newSaleData.amountPaidUSD || 0);
    if (debtAmount > 0) {
        const newDebitTransaction: Transaction = {
            id: `T${Date.now()}-D`,
            date: newSaleData.date,
            description: `Sale #${invoiceNumber}`,
            type: 'DEBIT',
            amountUSD: totalUSD,
            items: enrichedCart,
        };
        const newTransactions = [...(customer.transactions || []), newDebitTransaction];

        if (newSaleData.amountPaidUSD && newSaleData.amountPaidUSD > 0) {
            const newCreditTransaction: Transaction = {
                id: `T${Date.now()}-C`,
                date: newSaleData.date,
                description: `Down payment for sale #${invoiceNumber}`,
                type: 'CREDIT',
                amountUSD: newSaleData.amountPaidUSD,
            };
            newTransactions.push(newCreditTransaction);
        }

        updateCustomer(customer.id, {
            totalDebtUSD: customer.totalDebtUSD + debtAmount,
            transactions: newTransactions
        });
    }

    return newSaleRecord;
  }, [activeBranch, updateProduct, updateCustomer, products]);
  
  const dataValue = useMemo(() => ({ sales, isLoading }), [sales, isLoading]);
  const actionsValue = React.useMemo(() => ({ recordNewSaleTransaction }), [recordNewSaleTransaction]);


  return (
    <SaleDataContext.Provider value={dataValue}>
      <SaleActionsContext.Provider value={actionsValue}>
        {children}
      </SaleActionsContext.Provider>
    </SaleDataContext.Provider>
  );
};

// --- Custom Hooks ---

export const useSaleData = (): SaleDataContextType => {
    const context = useContext(SaleDataContext);
    if (context === undefined) {
        throw new Error('useSaleData must be used within a SaleProvider');
    }
    return context;
};


export const useSaleActions = (): SaleActionsContextType => {
  const context = React.useContext(SaleActionsContext);
  if (context === undefined) {
    throw new Error('useSaleActions must be used within a SaleProvider');
  }
  return context;
};
