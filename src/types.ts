export interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  quantity: number;
  telegramFileId?: string;
  imageUrl?: string;
  createdAt: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  profit: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  year: string; // YYYY
  createdAt: number;
}

export interface DashboardStats {
  todayProfit: number;
  monthlyProfit: number;
  yearlyProfit: number;
  todaySalesCount: number;
  monthlySalesCount: number;
  todaySaleAmount: number;
  monthlySaleAmount: number;
  totalStockQuantity: number;
  totalStockValue: number;
  uniqueProductsCount: number;
}
