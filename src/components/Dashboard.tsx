import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Sale, DashboardStats } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Plus,
  List,
  CreditCard,
  Download,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, subMonths } from 'date-fns';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todayProfit: 0,
    monthlyProfit: 0,
    yearlyProfit: 0,
    todaySalesCount: 0,
    monthlySalesCount: 0,
    todaySaleAmount: 0,
    monthlySaleAmount: 0,
    totalStockQuantity: 0,
    totalStockValue: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Real-time products stats
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
      const totalValue = products.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
      
      setStats(prev => ({
        ...prev,
        totalStockQuantity: totalQuantity,
        totalStockValue: totalValue,
        uniqueProductsCount: products.length,
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    // Real-time sales stats
    const today = format(new Date(), 'yyyy-MM-dd');
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentYear = format(new Date(), 'yyyy');

    const unsubscribeSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      
      const todaySales = sales.filter(s => s.date === today);
      const monthlySales = sales.filter(s => s.month === currentMonth);
      const yearlySales = sales.filter(s => s.year === currentYear);

      setStats(prev => ({
        ...prev,
        todayProfit: todaySales.reduce((sum, s) => sum + s.profit, 0),
        monthlyProfit: monthlySales.reduce((sum, s) => sum + s.profit, 0),
        yearlyProfit: yearlySales.reduce((sum, s) => sum + s.profit, 0),
        todaySalesCount: todaySales.reduce((sum, s) => sum + s.quantity, 0),
        monthlySalesCount: monthlySales.reduce((sum, s) => sum + s.quantity, 0),
        todaySaleAmount: todaySales.reduce((sum, s) => sum + (s.sellingPrice * s.quantity), 0),
        monthlySaleAmount: monthlySales.reduce((sum, s) => sum + (s.sellingPrice * s.quantity), 0),
      }));

      // Prepare chart data for last 6 months
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return format(date, 'yyyy-MM');
      });

      const data = last6Months.map(month => {
        const monthSales = sales.filter(s => s.month === month);
        return {
          name: format(new Date(month + '-01'), 'MMM'),
          profit: monthSales.reduce((sum, s) => sum + s.profit, 0),
          sales: monthSales.reduce((sum, s) => sum + s.quantity, 0),
        };
      });
      setChartData(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sales');
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSales();
    };
  }, []);

  const actionButtons = [
    { label: 'Add Product', icon: Plus, color: 'bg-[#5c6bc0]', hover: 'hover:bg-[#4e5ba6]' },
    { label: 'Sale Product', icon: ShoppingCart, color: 'bg-[#43a047]', hover: 'hover:bg-[#388e3c]' },
    { label: 'Sale List', icon: List, color: 'bg-[#7e57c2]', hover: 'hover:bg-[#6d46b0]' },
    { label: 'Cash Sale', icon: CreditCard, color: 'bg-[#d84315]', hover: 'hover:bg-[#bf360c]' },
    { label: 'Monthly Report', icon: BarChart3, color: 'bg-[#424242]', hover: 'hover:bg-[#212121]' },
    { label: 'Mobile Bazar', icon: Download, color: 'bg-[#1e88e5]', hover: 'hover:bg-[#1976d2]' },
  ];

  const statCards = [
    { id: 'unique-products', title: "Unique Products", value: stats.uniqueProductsCount, icon: Package, color: "text-blue-600", bg: "bg-blue-100" },
    { id: 'stock-qty', title: "Total Quantity", value: stats.totalStockQuantity, icon: List, color: "text-cyan-600", bg: "bg-cyan-100" },
    { id: 'stock-value', title: "Stock Value", value: stats.totalStockValue, icon: BarChart3, color: "text-orange-600", bg: "bg-orange-100" },
    { id: 'today-sales-count', title: "Today Sale (Qty)", value: stats.todaySalesCount, icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-100" },
    { id: 'today-sale-amount', title: "Today Sale (Amount)", value: stats.todaySaleAmount, icon: CreditCard, color: "text-rose-600", bg: "bg-rose-100" },
    { id: 'today-profit', title: "Today Profit", value: stats.todayProfit, icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
    { id: 'monthly-sale-amount', title: "Monthly Sale", value: stats.monthlySaleAmount, icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-100" },
    { id: 'monthly-profit', title: "Monthly Profit", value: stats.monthlyProfit, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  return (
    <div className="space-y-10">
      {/* Redesigned Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <motion.div 
                className={`w-16 h-16 rounded-2xl ${stat.bg} flex items-center justify-center shadow-sm`}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </motion.div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <div className="text-2xl font-black tracking-tight">
                  <AnimatedNumber 
                    value={stat.value} 
                    prefix={stat.id.includes('profit') || stat.id.includes('value') || stat.id.includes('amount') ? '৳' : ''} 
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart Section (Optional, kept for value) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="pt-4"
      >
        <Card className="shadow-sm border-none bg-white/40 backdrop-blur-sm p-4 rounded-3xl">
          <CardHeader className="p-2">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Profit Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[180px] w-full p-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="profit" 
                  radius={[6, 6, 6, 6]}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationBegin={500}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#3b82f6' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

