import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  ShoppingCart, 
  List, 
  CreditCard, 
  BarChart3, 
  Download,
  Search,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductImage } from './ProductImage';
import { Product, Sale } from '../types';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { uploadToTelegram } from '../lib/telegram';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuickActionsProps {
  products: Product[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ products }) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isQuickSaleModalOpen, setIsQuickSaleModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isSaleListModalOpen, setIsSaleListModalOpen] = useState(false);
  const [isMonthlyReportModalOpen, setIsMonthlyReportModalOpen] = useState(false);
  
  const [quickSaleSearch, setQuickSaleSearch] = useState('');
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [productForm, setProductForm] = useState({
    name: '',
    purchasePrice: '',
    quantity: '',
    image: null as File | null,
  });
  
  const [sellForm, setSellForm] = useState({
    sellingPrice: '',
    quantity: '1',
  });

  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  const filteredForQuickSale = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(quickSaleSearch.toLowerCase()) && p.quantity > 0
    );
  }, [products, quickSaleSearch]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      let fileId = '';
      if (productForm.image) {
        fileId = await uploadToTelegram(productForm.image, (percent) => {
          setUploadProgress(percent);
        });
      }

      const productData = {
        name: productForm.name,
        purchasePrice: Number(productForm.purchasePrice),
        quantity: Number(productForm.quantity),
        telegramFileId: fileId,
        createdAt: Date.now(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'products'), productData).catch(err => handleFirestoreError(err, OperationType.WRITE, 'products'));
      toast.success('Product added successfully');
      setIsProductModalOpen(false);
      setProductForm({ name: '', purchasePrice: '', quantity: '', image: null });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingProduct) return;
    
    const sellQty = Number(sellForm.quantity);
    if (sellQty > sellingProduct.quantity) {
      toast.error('Not enough stock');
      return;
    }

    setIsSubmitting(true);
    try {
      const sellingPrice = Number(sellForm.sellingPrice);
      const profit = (sellingPrice - sellingProduct.purchasePrice) * sellQty;
      const now = new Date();

      const saleData = {
        productId: sellingProduct.id,
        productName: sellingProduct.name,
        purchasePrice: sellingProduct.purchasePrice,
        sellingPrice,
        quantity: sellQty,
        profit,
        date: format(now, 'yyyy-MM-dd'),
        month: format(now, 'yyyy-MM'),
        year: format(now, 'yyyy'),
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'sales'), saleData).catch(err => handleFirestoreError(err, OperationType.WRITE, 'sales'));
      await updateDoc(doc(db, 'products', sellingProduct.id), {
        quantity: sellingProduct.quantity - sellQty,
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `products/${sellingProduct.id}`));

      toast.success('Sale recorded successfully');
      setIsSellModalOpen(false);
      setSellForm({ sellingPrice: '', quantity: '1' });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to record sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(1000));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      setRecentSales(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sales');
    });
    return unsubscribe;
  }, []);

  const openSaleList = () => {
    setIsSaleListModalOpen(true);
  };

  const actions = [
    { label: 'Add Product', icon: Plus, color: 'bg-[#5c6bc0]', onClick: () => setIsProductModalOpen(true) },
    { label: 'Sale Product', icon: ShoppingCart, color: 'bg-[#43a047]', onClick: () => setIsQuickSaleModalOpen(true) },
    { label: 'Sale List', icon: List, color: 'bg-[#7e57c2]', onClick: openSaleList },
    { label: 'Monthly Report', icon: BarChart3, color: 'bg-[#424242]', onClick: () => setIsMonthlyReportModalOpen(true) },
  ];

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(format(new Date(), 'yyyy-MM'));
    recentSales.forEach(s => months.add(s.month));
    return Array.from(months).sort().reverse();
  }, [recentSales]);

  const monthlyStats = useMemo(() => {
    const salesThisMonth = recentSales.filter(s => s.month === selectedMonth);
    
    return {
      totalPieces: salesThisMonth.reduce((sum, s) => sum + s.quantity, 0),
      totalValue: salesThisMonth.reduce((sum, s) => sum + (s.sellingPrice * s.quantity), 0),
      totalProfit: salesThisMonth.reduce((sum, s) => sum + s.profit, 0),
      totalTransactions: salesThisMonth.length,
    };
  }, [recentSales, selectedMonth]);

  return (
    <div className="flex flex-col gap-3">
      {actions.map((action, index) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Button 
            onClick={action.onClick}
            className={`w-full h-14 ${action.color} hover:opacity-90 text-white font-bold text-lg rounded-xl shadow-md border-none flex items-center justify-center gap-3 transition-all active:scale-95`}
          >
            <action.icon className="h-6 w-6" />
            {action.label}
          </Button>
        </motion.div>
      ))}

      {/* Add Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">Add New Product</DialogTitle>
            <DialogDescription className="text-slate-500">
              Fill in the details to add a new item to your stock.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Product Name</Label>
              <Input 
                id="name" 
                required 
                placeholder="e.g. Realme C71"
                className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5c6bc0]/20 focus:border-[#5c6bc0] transition-all"
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-semibold text-slate-700">Purchase Price (৳)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  required 
                  placeholder="0.00"
                  className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5c6bc0]/20 focus:border-[#5c6bc0] transition-all"
                  value={productForm.purchasePrice}
                  onChange={(e) => setProductForm({...productForm, purchasePrice: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-semibold text-slate-700">Quantity</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  required 
                  placeholder="0"
                  className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5c6bc0]/20 focus:border-[#5c6bc0] transition-all"
                  value={productForm.quantity}
                  onChange={(e) => setProductForm({...productForm, quantity: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image" className="text-sm font-semibold text-slate-700">Product Image</Label>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="image" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Plus className="w-8 h-8 mb-3 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-slate-400">PNG, JPG or WEBP (MAX. 800x400px)</p>
                  </div>
                  <Input 
                    id="image" 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setProductForm({...productForm, image: e.target.files?.[0] || null})}
                  />
                </label>
              </div>
              {productForm.image && (
                <div className="space-y-1">
                  <p className="text-xs text-green-600 font-medium">Selected: {productForm.image.name}</p>
                  {isSubmitting && uploadProgress > 0 && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-[#5c6bc0] h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                  {isSubmitting && uploadProgress > 0 && (
                    <p className="text-[10px] text-slate-500 text-right font-bold">{uploadProgress}% uploaded</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full h-12 bg-[#5c6bc0] hover:bg-[#4a57a9] text-white font-bold rounded-xl shadow-lg transition-all active:scale-95" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress > 0 && uploadProgress < 100 ? `Uploading Image... ${uploadProgress}%` : 'Saving Product...'}
                  </>
                ) : 'Save Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Sale Modal */}
      <Dialog open={isQuickSaleModalOpen} onOpenChange={setIsQuickSaleModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Quick Sale</DialogTitle>
            <DialogDescription>Search and select a product to record a sale.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search product to sell..." 
                className="pl-10"
                value={quickSaleSearch}
                onChange={(e) => setQuickSaleSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {filteredForQuickSale.map(product => (
                <div 
                  key={`quick-sale-action-${product.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSellingProduct(product);
                    setSellForm({ sellingPrice: '', quantity: '1' });
                    setIsSellModalOpen(true);
                    setIsQuickSaleModalOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                      <ProductImage fileId={product.telegramFileId} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">Stock: {product.quantity} | ৳{product.purchasePrice}</p>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sell Form Modal */}
      <Dialog open={isSellModalOpen} onOpenChange={setIsSellModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Sale</DialogTitle>
            <DialogDescription>Selling: {sellingProduct?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSellProduct} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sellPrice">Selling Price (৳)</Label>
              <Input 
                id="sellPrice" 
                type="number" 
                required 
                placeholder={`Purchase: ৳${sellingProduct?.purchasePrice}`}
                value={sellForm.sellingPrice}
                onChange={(e) => setSellForm({...sellForm, sellingPrice: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellQty">Quantity</Label>
              <Input 
                id="sellQty" 
                type="number" 
                required 
                max={sellingProduct?.quantity}
                min="1"
                value={sellForm.quantity}
                onChange={(e) => setSellForm({...sellForm, quantity: e.target.value})}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Sale
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sale List Modal */}
      <Dialog open={isSaleListModalOpen} onOpenChange={setIsSaleListModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Recent Sales</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {recentSales.map(sale => (
              <div key={sale.id} className="p-3 rounded-lg border bg-slate-50/50 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{sale.productName}</p>
                  <p className="text-xs text-muted-foreground">{sale.date} | Qty: {sale.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">৳{sale.sellingPrice}</p>
                  <p className="text-[10px] text-muted-foreground">Profit: ৳{sale.profit}</p>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && <p className="text-center py-8 text-muted-foreground">No sales recorded yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
      {/* Monthly Report Modal */}
      <Dialog open={isMonthlyReportModalOpen} onOpenChange={setIsMonthlyReportModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-slate-800">Monthly Report</DialogTitle>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px] h-9 rounded-xl border-slate-200">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {format(new Date(month + '-01'), 'MMMM yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogDescription className="text-slate-500">
              Performance summary for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center text-center">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Total Pieces</p>
              <p className="text-2xl font-black text-blue-900">{monthlyStats.totalPieces}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center text-center">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Total Value</p>
              <p className="text-2xl font-black text-indigo-900">৳{monthlyStats.totalValue.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-2xl bg-green-50 border border-green-100 flex flex-col items-center text-center">
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Total Profit</p>
              <p className="text-2xl font-black text-green-900">৳{monthlyStats.totalProfit.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Total Sales</p>
              <p className="text-2xl font-black text-slate-900">{monthlyStats.totalTransactions}</p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl" onClick={() => setIsMonthlyReportModalOpen(false)}>
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
