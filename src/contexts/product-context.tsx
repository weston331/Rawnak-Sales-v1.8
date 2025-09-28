
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useMemo, useCallback, useState, useEffect, useContext } from 'react';
import { useSettings } from './settings-context';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, getDocs, setDoc } from 'firebase/firestore';

// Define the Product interface
export interface Product {
  id: string;
  name: string;
  category: string;
  priceUSD: number; 
  purchasePriceUSD: number;
  stock: number;
  barcode?: string;
  description?: string;
  lowStockThreshold?: number;
  createdAt: string;
}

export interface Category {
    name: string;
    color?: string;
    isPinned?: boolean;
}


// Seed data for demo/offline mode
export const initialProducts: Product[] = [
  { id: '1', name: 'Basmati Rice (1kg)', category: 'Grains', priceUSD: 2.50, purchasePriceUSD: 2.00, stock: 150, barcode: '6291041500214', lowStockThreshold: 10, createdAt: '2024-05-01T12:00:00.000Z' },
  { id: '2', name: 'Organic Apples', category: 'Fruits', priceUSD: 3.00, purchasePriceUSD: 2.40, stock: 8, barcode: '8901020304051', lowStockThreshold: 10, createdAt: '2024-05-05T12:00:00.000Z' },
  { id: '3', name: 'Fresh Milk (1L)', category: 'Dairy', priceUSD: 1.20, purchasePriceUSD: 0.96, stock: 75, barcode: '4012345678901', lowStockThreshold: 20, createdAt: '2024-06-10T12:00:00.000Z' },
  { id: '4', name: 'Whole Wheat Bread', category: 'Bakery', priceUSD: 2.00, purchasePriceUSD: 1.60, stock: 0, barcode: '0731300052392', lowStockThreshold: 5, createdAt: '2024-07-01T12:00:00.000Z' },
  { id: '5', name: 'Chicken Breast (500g)', category: 'Meat', priceUSD: 5.50, purchasePriceUSD: 4.40, stock: 40, barcode: '5012345678901', lowStockThreshold: 15, createdAt: '2024-07-15T12:00:00.000Z' },
];
export const initialDefinedCategories: Category[] = [ 
    { name: 'Grains', color: '#FBBF24', isPinned: true },
    { name: 'Fruits' },
    { name: 'Dairy' },
    { name: 'Bakery' },
    { name: 'Meat', isPinned: true },
    { name: 'Beverages' },
    { name: 'Trucks' }
];


// --- Context Definitions ---

interface ProductDataContextType {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
}
const ProductDataContext = createContext<ProductDataContextType | undefined>(undefined);


interface ProductActionsContextType {
  addProduct: (productData: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCategory: (categoryName: string) => Promise<void>;
  updateCategory: (categoryName: string, data: Partial<Omit<Category, 'name'>>) => Promise<void>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
}

const ProductActionsContext = createContext<ProductActionsContextType | undefined>(undefined);


export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { activeBranch, isInitialized: isSettingsInitialized } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSettingsInitialized || !activeBranch) {
      return;
    }

    const branchId = activeBranch.id;
    const productsCacheKey = `products_${branchId}`;
    const categoriesCacheKey = `categories_v2_${branchId}`;
    
    setIsLoading(true);

    // Immediately try to load data from localStorage to make the UI responsive.
    try {
      const cachedProducts = localStorage.getItem(productsCacheKey);
      if (cachedProducts) {
        setProducts(JSON.parse(cachedProducts));
      }
      const cachedCategories = localStorage.getItem(categoriesCacheKey);
      if (cachedCategories) {
        setCategories(JSON.parse(cachedCategories));
      }
      // If we have cached data, we can show the UI sooner.
      if (cachedProducts && cachedCategories) {
        setIsLoading(false);
      }
    } catch (e) {
      console.error("Failed to load product data from localStorage", e);
    }
    
    // If Firebase is not configured, use initial mock data and stop.
    if (!isFirebaseConfigured || !db) {
        const cachedProducts = localStorage.getItem(productsCacheKey);
        const cachedCategories = localStorage.getItem(categoriesCacheKey);
        
        if (!cachedProducts) {
            setProducts(initialProducts);
            localStorage.setItem(productsCacheKey, JSON.stringify(initialProducts));
        }
        if (!cachedCategories) {
            setCategories(initialDefinedCategories);
            localStorage.setItem(categoriesCacheKey, JSON.stringify(initialDefinedCategories));
        }
        setIsLoading(false);
        return;
    }
    
    // Listener for products
    const productsQuery = query(collection(db, `branches/${branchId}/products`), orderBy("createdAt", "desc"));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(productsData);
        localStorage.setItem(productsCacheKey, JSON.stringify(productsData));
        setIsLoading(false); // Data has been loaded from Firebase
    }, (error) => {
        console.error("Error fetching real-time products:", error);
        setIsLoading(false);
    });

    // Listener for categories
    const categoriesDocRef = doc(db, `branches/${branchId}/data`, 'categories');
    const unsubscribeCategories = onSnapshot(categoriesDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const categoryList = docSnap.data().list || [];
            
            // Migration logic: check if categories are strings, if so, convert them to objects
            if (categoryList.length > 0 && typeof categoryList[0] === 'string') {
                const migratedCategories: Category[] = categoryList.map((name: string) => ({ name }));
                setCategories(migratedCategories);
                setDoc(categoriesDocRef, { list: migratedCategories }); // Update Firestore with new structure
            } else {
                setCategories(categoryList);
            }
            localStorage.setItem(categoriesCacheKey, JSON.stringify(categoryList));

        } else {
             if (branchId === 'main') { // Seeding logic for main branch on first run
                const productsCollectionRef = collection(db, 'branches/main/products');
                getDocs(productsCollectionRef).then(productSnapshot => {
                    if (productSnapshot.empty) {
                        console.log("Seeding initial products and categories for 'main' branch...");
                        const batch = writeBatch(db);
                        initialProducts.forEach(p => {
                            const { id, ...productData } = p;
                            batch.set(doc(productsCollectionRef, id), productData);
                        });
                        batch.set(categoriesDocRef, { list: initialDefinedCategories });
                        batch.commit();
                    }
                });
             } else {
                setCategories([]);
                localStorage.setItem(categoriesCacheKey, JSON.stringify([]));
             }
        }
    }, (error) => {
        console.error("Error fetching categories:", error);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, [activeBranch, isSettingsInitialized]);

  
  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    const branchId = activeBranch?.id;
    if (!branchId) return;

    const createdAt = new Date().toISOString();
    const newProduct: Product = { ...productData, createdAt, id: `local-${Date.now()}` };

    setProducts(prev => {
        const updated = [newProduct, ...prev];
        localStorage.setItem(`products_${branchId}`, JSON.stringify(updated));
        return updated;
    });

    if (!isFirebaseConfigured || !db) return;

    const productsCollectionRef = collection(db, `branches/${branchId}/products`);
    await addDoc(productsCollectionRef, { ...productData, createdAt });
  }, [activeBranch]);
  
  const updateProduct = useCallback(async (productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    const branchId = activeBranch?.id;
    if (!branchId) return;

    setProducts(prev => {
        const updated = prev.map(p => p.id === productId ? {...p, ...productData} as Product : p);
        localStorage.setItem(`products_${branchId}`, JSON.stringify(updated));
        return updated;
    });

    if (!isFirebaseConfigured || !db) return;

    const productDocRef = doc(db, `branches/${branchId}/products`, productId);
    await updateDoc(productDocRef, productData);
  }, [activeBranch]);

  const deleteProduct = useCallback(async (productId: string) => {
    const branchId = activeBranch?.id;
    if (!branchId) return;
    
    setProducts(prev => {
        const updated = prev.filter(p => p.id !== productId);
        localStorage.setItem(`products_${branchId}`, JSON.stringify(updated));
        return updated;
    });

    if (!isFirebaseConfigured || !db) return;

    const productDocRef = doc(db, `branches/${branchId}/products`, productId);
    await deleteDoc(productDocRef);
  }, [activeBranch]);
  
  const addCategory = useCallback(async (categoryName: string) => {
    const branchId = activeBranch?.id;
    if (!branchId) return;
    
    const trimmedName = categoryName.trim();
    if (!trimmedName || categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) return;

    const newCategory: Category = { name: trimmedName };
    const newCategories = [...categories, newCategory];
    
    setCategories(newCategories);
    localStorage.setItem(`categories_v2_${branchId}`, JSON.stringify(newCategories));

    if (!isFirebaseConfigured || !db) return;

    const categoriesDocRef = doc(db, `branches/${branchId}/data`, 'categories');
    await setDoc(categoriesDocRef, { list: newCategories });
  }, [activeBranch, categories]);

  const updateCategory = useCallback(async (categoryName: string, data: Partial<Omit<Category, 'name'>>) => {
    const branchId = activeBranch?.id;
    if (!branchId) return;
    
    const newCategories = categories.map(c => 
      c.name === categoryName ? { ...c, ...data } : c
    );
    setCategories(newCategories);
    localStorage.setItem(`categories_v2_${branchId}`, JSON.stringify(newCategories));

    if (!isFirebaseConfigured || !db) return;

    const categoriesDocRef = doc(db, `branches/${branchId}/data`, 'categories');
    await setDoc(categoriesDocRef, { list: newCategories });

  }, [activeBranch, categories]);

  const renameCategory = useCallback(async (oldName: string, newName: string) => {
    const branchId = activeBranch?.id;
    if (!branchId) return;
    
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || oldName === trimmedNewName) return;
    
    // Optimistic UI updates
    const newCategories = categories.map(c => c.name === oldName ? {...c, name: trimmedNewName} : c);
    setCategories(newCategories);
    localStorage.setItem(`categories_v2_${branchId}`, JSON.stringify(newCategories));

    const newProducts = products.map(p => p.category === oldName ? {...p, category: trimmedNewName} : p);
    setProducts(newProducts);
    localStorage.setItem(`products_${branchId}`, JSON.stringify(newProducts));


    if (!isFirebaseConfigured || !db) return;
    
    const batch = writeBatch(db);
    
    const categoriesDocRef = doc(db, `branches/${branchId}/data`, 'categories');
    batch.set(categoriesDocRef, { list: newCategories });

    const productsToUpdate = products.filter(p => p.category === oldName);
    productsToUpdate.forEach(product => {
        const productRef = doc(db, `branches/${branchId}/products`, product.id);
        batch.update(productRef, { category: trimmedNewName });
    });

    await batch.commit();
  }, [activeBranch, categories, products]);

  const deleteCategory = useCallback(async (categoryName: string) => {
    const branchId = activeBranch?.id;
    if (!branchId) return;

    const isCategoryInUse = products.some(p => p.category === categoryName);
    if (isCategoryInUse) {
        throw new Error("CATEGORY_IN_USE");
    }

    const newCategories = categories.filter(c => c.name !== categoryName);
    setCategories(newCategories);
    localStorage.setItem(`categories_v2_${branchId}`, JSON.stringify(newCategories));

    if (!isFirebaseConfigured || !db) return;
    
    const categoriesDocRef = doc(db, `branches/${branchId}/data`, 'categories');
    await setDoc(categoriesDocRef, { list: newCategories });
  }, [activeBranch, products, categories]);
  
  const dataValue = useMemo(() => ({ products, categories, isLoading }), [products, categories, isLoading]);
  const actionsValue = React.useMemo(() => ({ addProduct, updateProduct, deleteProduct, addCategory, updateCategory, renameCategory, deleteCategory }), [addProduct, updateProduct, deleteProduct, addCategory, updateCategory, renameCategory, deleteCategory]);

  return (
    <ProductDataContext.Provider value={dataValue}>
        <ProductActionsContext.Provider value={actionsValue}>
            {children}
        </ProductActionsContext.Provider>
    </ProductDataContext.Provider>
  );
};


// --- Custom Hooks ---

export const useProductData = (): ProductDataContextType => {
  const context = useContext(ProductDataContext);
  if (context === undefined) {
    throw new Error('useProductData must be used within a ProductProvider');
  }
  return context;
};

export const useProductActions = (): ProductActionsContextType => {
  const context = React.useContext(ProductActionsContext);
  if (context === undefined) {
    throw new Error('useProductActions must be used within a ProductProvider');
  }
  return context;
};

    