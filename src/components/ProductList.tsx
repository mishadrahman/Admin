import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Product, Sale } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ShoppingCart, 
  AlertTriangle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ProductImage } from './ProductImage';
import { uploadToTelegram } from '@/lib/telegram';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isQuickSaleModalOpen, setIsQuickSaleModalOpen] = useState(false);
  const [quickSaleSearch, setQuickSaleSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    purchasePrice: '',
    quantity: '',
    image: null as File | null,
  });
  const [sellForm, setSellForm] = useState({
    sellingPrice: '',
    quantity: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
    return unsubscribe;
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterLowStock ? p.quantity < 5 : true;
      return matchesSearch && matchesFilter;
    });
  }, [products, search, filterLowStock]);

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
      let fileId = editingProduct?.telegramFileId || '';
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
        updatedAt: serverTimestamp(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData).catch(err => handleFirestoreError(err, OperationType.WRITE, `products/${editingProduct.id}`));
        toast.success('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: Date.now(),
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'products'));
        toast.success('Product added successfully');
      }
      setIsProductModalOpen(false);
      resetProductForm();
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
      setSellForm({ sellingPrice: '', quantity: '' });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to record sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `products/${productToDelete.id}`));
      toast.success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({ name: '', purchasePrice: '', quantity: '', image: null });
    setEditingProduct(null);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      purchasePrice: product.purchasePrice.toString(),
      quantity: product.quantity.toString(),
      image: null,
    });
    setIsProductModalOpen(true);
  };

  const openSellModal = (product: Product) => {
    setSellingProduct(product);
    setSellForm({
      sellingPrice: '',
      quantity: '1',
    });
    setIsSellModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-indigo-600" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">Product Stock List</CardTitle>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                className="pl-10 bg-slate-50 border-slate-200 h-11 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button 
                variant={filterLowStock ? "destructive" : "outline"}
                className="flex-1 md:flex-none border-slate-200 h-11 rounded-xl"
                onClick={() => setFilterLowStock(!filterLowStock)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Low Stock
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product) => (
                    <motion.tr
                      key={product.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="py-4 px-6 max-w-[200px]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                            <ProductImage 
                              fileId={product.telegramFileId} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 leading-tight truncate" title={product.name}>{product.name}</p>
                            {product.quantity < 5 && (
                              <span className="inline-flex items-center text-[10px] font-bold text-red-500 mt-1">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                LOW STOCK
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-bold text-slate-700">৳{product.purchasePrice.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant={product.quantity < 5 ? "destructive" : "secondary"} className="rounded-lg px-2 py-0.5">
                          {product.quantity}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => openSellModal(product)}
                            disabled={product.quantity === 0}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                            onClick={() => openEditModal(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-slate-400 font-medium">No products found matching your search.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isProductModalOpen} onOpenChange={(open) => {
        setIsProductModalOpen(open);
        if (!open) resetProductForm();
      }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription className="text-slate-500">
              Update the details for this item in your stock.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-semibold text-slate-700">Product Name</Label>
              <Input 
                id="edit-name" 
                required 
                className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price" className="text-sm font-semibold text-slate-700">Purchase Price (৳)</Label>
                <Input 
                  id="edit-price" 
                  type="number" 
                  required 
                  className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                  value={productForm.purchasePrice}
                  onChange={(e) => setProductForm({...productForm, purchasePrice: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantity" className="text-sm font-semibold text-slate-700">Quantity</Label>
                <Input 
                  id="edit-quantity" 
                  type="number" 
                  required 
                  className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                  value={productForm.quantity}
                  onChange={(e) => setProductForm({...productForm, quantity: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-image" className="text-sm font-semibold text-slate-700">Product Image</Label>
              <Input 
                id="edit-image" 
                type="file" 
                accept="image/*"
                className="h-11 rounded-xl border-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                onChange={(e) => setProductForm({...productForm, image: e.target.files?.[0] || null})}
              />
              {productForm.image && (
                <div className="space-y-1">
                  <p className="text-xs text-green-600 font-medium">Selected: {productForm.image.name}</p>
                  {isSubmitting && uploadProgress > 0 && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-indigo-600 h-full"
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
              <Button type="button" variant="outline" className="rounded-xl h-11" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress > 0 && uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Saving...'}
                  </>
                ) : (editingProduct ? 'Update Product' : 'Save Product')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sell Modal */}
      <Dialog open={isSellModalOpen} onOpenChange={setIsSellModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">Sell Product</DialogTitle>
            <DialogDescription className="text-slate-500">
              Recording sale for: <span className="font-bold text-indigo-600">{sellingProduct?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSellProduct} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sellPrice" className="text-sm font-semibold text-slate-700">Selling Price (৳)</Label>
              <Input 
                id="sellPrice" 
                type="number" 
                required 
                placeholder={`Purchase: ৳${sellingProduct?.purchasePrice}`}
                className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                value={sellForm.sellingPrice}
                onChange={(e) => setSellForm({...sellForm, sellingPrice: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellQty" className="text-sm font-semibold text-slate-700">Quantity to Sell (Max: {sellingProduct?.quantity})</Label>
              <Input 
                id="sellQty" 
                type="number" 
                required 
                max={sellingProduct?.quantity}
                min="1"
                className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                value={sellForm.quantity}
                onChange={(e) => setSellForm({...sellForm, quantity: e.target.value})}
              />
            </div>
            {sellForm.sellingPrice && sellForm.quantity && sellingProduct && (
              <div className="p-4 rounded-xl bg-indigo-50 text-indigo-700 text-sm space-y-2 border border-indigo-100">
                <div className="flex justify-between">
                  <span className="font-medium">Total Sale:</span>
                  <span className="font-bold">৳{(Number(sellForm.sellingPrice) * Number(sellForm.quantity)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total Profit:</span>
                  <span className="font-bold">৳{((Number(sellForm.sellingPrice) - sellingProduct.purchasePrice) * Number(sellForm.quantity)).toLocaleString()}</span>
                </div>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" className="rounded-xl h-11" onClick={() => setIsSellModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Sale
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[380px] rounded-[2rem] border-none shadow-2xl bg-white/95 backdrop-blur-md p-0 overflow-hidden">
          <div className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 animate-pulse">
              <AlertCircle className="h-10 w-10" />
            </div>
            
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Are you sure?</DialogTitle>
              <DialogDescription className="text-slate-500 text-base leading-relaxed">
                You are about to delete <span className="font-bold text-slate-900 underline decoration-red-200 decoration-4 underline-offset-2">{productToDelete?.name}</span>. This action is permanent.
              </DialogDescription>
            </div>
          </div>

          <div className="bg-slate-50 p-6 flex gap-3">
            <Button 
              type="button" 
              variant="ghost" 
              className="flex-1 h-12 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all" 
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className="flex-1 h-12 rounded-2xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center" 
              onClick={confirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Yes, Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
