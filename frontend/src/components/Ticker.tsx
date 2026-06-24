import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const INITIAL_TICKERS: TickerItem[] = [
  { symbol: 'SPX', name: 'S&P 500', price: 5473.17, change: 24.51, changePercent: 0.45 },
  { symbol: 'IXIC', name: 'NASDAQ', price: 17722.66, change: 118.63, changePercent: 0.67 },
  { symbol: 'DJI', name: 'DOW JONES', price: 39150.30, change: -12.44, changePercent: -0.03 },
  { symbol: 'NSEI', name: 'NIFTY 50', price: 23537.85, change: 188.20, changePercent: 0.81 },
  { symbol: 'BSESN', name: 'SENSEX', price: 77337.59, change: 620.73, changePercent: 0.81 },
  { symbol: 'BTCUSD', name: 'BITCOIN', price: 61850.50, change: -820.00, changePercent: -1.31 },
  { symbol: 'BRENT', name: 'BRENT CRUDE', price: 85.24, change: 0.88, changePercent: 1.04 },
  { symbol: 'GC1!', name: 'GOLD', price: 2332.10, change: 14.80, changePercent: 0.64 },
  { symbol: 'USDINR', name: 'USD/INR', price: 83.47, change: 0.04, changePercent: 0.05 },
  { symbol: 'EURUSD', name: 'EUR/USD', price: 1.0734, change: -0.0012, changePercent: -0.11 },
];

export const Ticker: React.FC = () => {
  const [tickers, setTickers] = useState<TickerItem[]>(INITIAL_TICKERS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const changePercent = (Math.random() - 0.48) * 0.1;
          const priceDiff = t.price * (changePercent / 100);
          const newPrice = Number((t.price + priceDiff).toFixed(t.price < 10 ? 4 : 2));
          const newChange = Number((t.change + priceDiff).toFixed(2));
          const newPercent = Number((t.changePercent + changePercent).toFixed(2));
          return {
            ...t,
            price: newPrice,
            change: newChange,
            changePercent: newPercent,
          };
        })
      );
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const displayItems = [...tickers, ...tickers, ...tickers];

  return (
    <div className="w-full bg-white text-slate-800 text-[10px] font-mono border-b border-slate-200 overflow-hidden py-1.5 select-none z-40 relative">
      <div className="animate-ticker flex items-center gap-10">
        {displayItems.map((item, index) => {
          const isPositive = item.changePercent >= 0;
          return (
            <div key={`${item.symbol}-${index}`} className="flex items-center space-x-2 shrink-0 cursor-pointer hover:text-[#9A1C1F] transition-colors duration-150">
              <span className="font-bold text-slate-600 uppercase tracking-tight bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-sm text-[9px]">
                {item.symbol}
              </span>
              <span className="text-slate-500 font-sans font-bold text-[9.5px]">{item.name}</span>
              <span className="font-bold text-slate-900">{item.price.toLocaleString(undefined, { minimumFractionDigits: item.price < 10 ? 4 : 2 })}</span>
              <span className={`flex items-center font-bold text-[10px] ${isPositive ? 'text-emerald-700' : 'text-red-650'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {isPositive ? '+' : ''}{item.changePercent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
