/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  X,
  PieChart,
  Calendar,
  Check,
  DollarSign,
  PiggyBank,
  AlertCircle,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Transaction, TransactionType } from '../../types';

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Housing & Rent',
  'Shopping & Books',
  'Wellness & Care',
  'Transport',
  'Entertainment',
  'Other Expenses',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance & Side',
  'Investments',
  'Gifts & Grants',
  'Other Income',
];

export const MoneyTrackerView: React.FC = () => {
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    categoryBudgets,
    updateCategoryBudget,
  } = useApp();

  // Selected Month Year Filter (default to current YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Add Transaction Form
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txNote, setTxNote] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Edit Transaction State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');

  // Delete Confirm State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Category Budget Edit State inside modal
  const [editingBudgets, setEditingBudgets] = useState<Record<string, number>>({});

  // Filter transactions for the selected month YYYY-MM
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Total Summary
  const { totalIncome, totalExpenses, netBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;

    monthTransactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    return {
      totalIncome: income,
      totalExpenses: expense,
      netBalance: income - expense,
    };
  }, [monthTransactions]);

  // Spending by Expense Category
  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
      });
    return spending;
  }, [monthTransactions]);

  // Search & Filtered List
  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNote = t.note && t.note.toLowerCase().includes(q);
        const matchesCategory = t.category.toLowerCase().includes(q);
        const matchesAmount = t.amount.toString().includes(q);
        if (!matchesNote && !matchesCategory && !matchesAmount) return false;
      }
      return true;
    });
  }, [monthTransactions, filterType, filterCategory, searchQuery]);

  // Form submit for new transaction
  const handleSaveNewTx = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(txAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    addTransaction({
      type: txType,
      amount: numAmount,
      category: txCategory,
      date: txDate,
      note: txNote.trim() || undefined,
    });

    setTxAmount('');
    setTxNote('');
    setIsAddModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditType(tx.type);
    setEditAmount(tx.amount.toString());
    setEditCategory(tx.category);
    setEditDate(tx.date);
    setEditNote(tx.note || '');
  };

  // Form submit for edit transaction
  const handleSaveEditTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    updateTransaction(editingTx.id, {
      type: editType,
      amount: numAmount,
      category: editCategory,
      date: editDate,
      note: editNote.trim() || undefined,
    });

    setEditingTx(null);
  };

  // Open Budget Modal
  const handleOpenBudgetModal = () => {
    setEditingBudgets({ ...categoryBudgets });
    setIsBudgetModalOpen(true);
  };

  // Save Budgets
  const handleSaveBudgets = () => {
    Object.entries(editingBudgets).forEach(([cat, val]) => {
      updateCategoryBudget(cat, val);
    });
    setIsBudgetModalOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 animate-in fade-in duration-300 select-none">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#0D0D0D] border border-[#292929] shadow-lg backdrop-blur-md">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0]">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-base sm:text-lg font-normal text-[#F5F5F5] tracking-tight">
              Money Tracker
            </h1>
            <span className="text-[10px] text-[#C0C0C0]">💳</span>
          </div>
          <p className="text-xs text-[#999999] font-light">
            Private tracking for income, expenses, and category monthly budgets.
          </p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#141414] border border-[#292929] rounded-xl px-2.5 py-1 text-xs text-[#F5F5F5]">
            <Calendar className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] text-xs font-semibold flex items-center gap-1.5 shadow-[0_2px_12px_rgba(192,192,192,0.15)] hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* 2. Monthly Summary Capsules */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Income Card */}
        <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#292929] space-y-1 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] text-[#999999]">
            <span className="font-light">Income</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-medium text-emerald-400 truncate">
            ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#292929] space-y-1 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] text-[#999999]">
            <span className="font-light">Expenses</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-base sm:text-lg font-medium text-rose-400 truncate">
            ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="p-3.5 rounded-2xl bg-[#0D0D0D] border border-[#292929] space-y-1 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] text-[#999999]">
            <span className="font-light">Net Saved</span>
            <PiggyBank className="w-3.5 h-3.5 text-[#C0C0C0]" />
          </div>
          <div className={`text-base sm:text-lg font-medium truncate ${netBalance >= 0 ? 'text-[#C0C0C0]' : 'text-rose-400'}`}>
            ${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 3. Category Budgets & Spending Progress */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D0D0D] border border-[#292929] shadow-lg backdrop-blur-md space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#292929]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C0C0C0]" />
            <h2 className="text-xs font-medium text-[#F5F5F5] uppercase tracking-wider">
              Category Spending & Limits
            </h2>
          </div>

          <button
            onClick={handleOpenBudgetModal}
            className="text-xs text-[#C0C0C0] hover:text-[#F5F5F5] font-light cursor-pointer transition-colors"
          >
            Adjust Limits
          </button>
        </div>

        {/* Budget Progress Bars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXPENSE_CATEGORIES.map((cat) => {
            const spent = categorySpending[cat] || 0;
            const limit = categoryBudgets[cat] || 300;
            const percent = Math.min(Math.round((spent / limit) * 100), 100);
            const isOver = spent > limit;

            return (
              <div key={cat} className="p-3 rounded-xl bg-[#111111] border border-[#292929] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-normal text-[#F5F5F5] text-[11px]">{cat}</span>
                  {isOver ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[9px] font-medium flex items-center gap-0.5">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Over
                    </span>
                  ) : (
                    <span className="text-[#999999] font-light text-[10px]">
                      {percent}%
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isOver
                        ? 'bg-rose-500'
                        : percent > 80
                        ? 'bg-zinc-400'
                        : 'bg-gradient-to-r from-[#A8A8A8] via-[#C0C0C0] to-[#E8E8E8]'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#999999] font-light">
                  <span>${spent.toFixed(2)}</span>
                  <span>Limit: ${limit.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Transaction History Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <h2 className="text-xs font-medium text-[#F5F5F5] uppercase tracking-wider">
            Transactions ({filteredTransactions.length})
          </h2>

          {/* Search and Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-44">
              <Search className="w-3.5 h-3.5 text-[#999999] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999] focus:outline-none focus:border-[#C0C0C0]/50"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#141414] border border-[#292929] rounded-xl px-2.5 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]/50 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#141414] border border-[#292929] rounded-xl px-2.5 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]/50 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions Table / List */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-[#0D0D0D] border border-[#292929] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0] mx-auto">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-normal text-[#F5F5F5]">No transactions found</h3>
            <p className="text-xs text-[#999999] font-light max-w-sm mx-auto">
              No transactions matching your search filters for {selectedMonth}. Tap "Add Record" to create one.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0D0D0D] border border-[#292929] overflow-hidden shadow-sm divide-y divide-[#292929] backdrop-blur-md">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  className="p-3 sm:px-4 hover:bg-[#161616] transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-normal text-[#F5F5F5] text-xs truncate">{tx.category}</span>
                        <span className="text-[10px] text-[#999999] font-light">
                          {tx.date}
                        </span>
                      </div>
                      {tx.note && (
                        <p className="text-[11px] text-[#999999] font-light italic truncate">
                          {tx.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs sm:text-sm font-medium ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isIncome ? '+' : '-'}${tx.amount.toFixed(2)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(tx)}
                        className="p-1 rounded-lg text-[#999999] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                        title="Edit transaction"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#C0C0C0]" />
                      </button>

                      {confirmDeleteId === tx.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              deleteTransaction(tx.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[10px] cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] text-[#999999] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(tx.id)}
                          className="p-1 rounded-lg text-[#999999] hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveNewTx}
            className="relative w-full max-w-lg bg-[#0D0D0D] border border-[#292929] rounded-3xl p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#C0C0C0]" />
                <h3 className="text-sm font-normal text-[#F5F5F5]">Add New Transaction</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#141414] border border-[#292929] flex items-center justify-center text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Type selector */}
              <div>
                <label className="text-[11px] text-[#999999] block mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('expense');
                      setTxCategory(EXPENSE_CATEGORIES[0]);
                    }}
                    className={`py-2 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                      txType === 'expense'
                        ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                        : 'bg-[#141414] border-[#292929] text-[#999999]'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('income');
                      setTxCategory(INCOME_CATEGORIES[0]);
                    }}
                    className={`py-2 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                      txType === 'income'
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#141414] border-[#292929] text-[#999999]'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Category</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                >
                  {(txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Date</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5]"
                  required
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Optional Note / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Organic coffee, Monthly rent, Side project..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#292929] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#161616] border border-[#292929] text-xs font-light text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
              >
                Save Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveEditTx}
            className="relative w-full max-w-lg bg-[#0D0D0D] border border-[#292929] rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <h3 className="text-sm font-normal text-[#F5F5F5]">Edit Transaction</h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="w-8 h-8 rounded-full bg-[#141414] border border-[#292929] flex items-center justify-center text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditType('expense')}
                  className={`py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                    editType === 'expense' ? 'bg-rose-950/60 border-rose-500/50 text-rose-300' : 'bg-[#141414] border-[#292929] text-[#999999]'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('income')}
                  className={`py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                    editType === 'income' ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-[#141414] border-[#292929] text-[#999999]'
                  }`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-sm text-[#F5F5F5]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5]"
                >
                  {(editType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#292929] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-4 py-2 rounded-xl bg-[#161616] border border-[#292929] text-xs font-light text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. Manage Category Budgets Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0D0D0D] border border-[#292929] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#C0C0C0]" />
                <h3 className="text-sm font-normal text-[#F5F5F5]">Manage Monthly Category Limits</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#141414] border border-[#292929] flex items-center justify-center text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {EXPENSE_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-[#111111] border border-[#292929]">
                  <span className="text-xs font-normal text-[#F5F5F5]">{cat}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#999999]">$</span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={editingBudgets[cat] ?? 300}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditingBudgets((prev) => ({ ...prev, [cat]: val }));
                      }}
                      className="w-24 px-2.5 py-1 rounded-xl bg-[#161616] border border-[#292929] text-xs text-[#F5F5F5] text-right focus:outline-none focus:border-[#C0C0C0]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#292929] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#161616] border border-[#292929] text-xs font-light text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBudgets}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A8A8] text-[#000000] text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
              >
                Save Limits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
