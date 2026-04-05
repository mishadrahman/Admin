import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import { Dashboard } from '@/components/Dashboard';
import { ProductList } from '@/components/ProductList';
import { QuickActions } from '@/components/QuickActions';
import { LoginForm } from '@/components/LoginForm';
import { SignupForm } from '@/components/SignupForm';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Moon, 
  Sun, 
  Smartphone, 
  LayoutDashboard, 
  Package,
  Plus,
  ShoppingCart,
  List,
  CreditCard,
  BarChart3,
  Download,
  Image as ImageIcon,
  User
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { Product } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

class ErrorBoundary extends React.Component<any, any> {
  public state: any = { hasError: false, error: null };
  public props: any;

  constructor(props: any) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) {
          errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <Card className="w-full max-w-md border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Application Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Reload Application
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
    return unsubscribe;
  }, [user]);

  if (!user) {
    return authMode === 'login' ? (
      <LoginForm onToggle={() => setAuthMode('signup')} />
    ) : (
      <SignupForm onToggle={() => setAuthMode('login')} />
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}`}>
      {/* New Header based on screenshot */}
      <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-md ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border-2 border-primary/20 shadow-sm">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Mehedy Telecom</h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Administrator</p>
                <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">v2.2</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 dark:bg-slate-800">
              <ImageIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full bg-slate-100 dark:bg-slate-800 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-8 max-w-lg">
        <QuickActions products={products} />
        <Dashboard />
        
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Inventory Overview</h2>
          </div>
          <ProductList />
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
