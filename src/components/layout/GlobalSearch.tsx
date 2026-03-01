'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import api from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  CubeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchCategory = 'customers' | 'products' | 'invoices' | 'quotations' | 'expenses';

interface SearchResultItem {
  id: string;
  category: SearchCategory;
  primary: string;
  secondary?: string;
  meta?: string;
  badge?: { label: string; color: string };
  href: string;
}

interface CategoryResults {
  category: SearchCategory;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: SearchResultItem[];
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_PER_CATEGORY = 5;

const CATEGORY_META: Record<
  SearchCategory,
  { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }
> = {
  customers: { label: 'Customers', icon: UserGroupIcon },
  products: { label: 'Products', icon: CubeIcon },
  invoices: { label: 'Invoices', icon: DocumentTextIcon },
  quotations: { label: 'Quotations', icon: DocumentTextIcon },
  expenses: { label: 'Expenses', icon: BanknotesIcon },
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
  converted: 'bg-purple-100 text-purple-700',
};

// ---------------------------------------------------------------------------
// API-backed search (replaces Zustand store search)
// ---------------------------------------------------------------------------

interface ApiSearchResults {
  categories: CategoryResults[];
  isLoading: boolean;
}

async function searchViaApi(
  query: string,
  fc: (n: number) => string,
  signal: AbortSignal
): Promise<CategoryResults[]> {
  const cats: CategoryResults[] = [];

  // Fire all searches in parallel
  const [customers, products, invoices, quotations, expenses] = await Promise.allSettled([
    api.get<{ data: any[] }>(`/api/v1/customers?search=${encodeURIComponent(query)}&limit=${MAX_PER_CATEGORY}`, { signal }),
    api.get<{ data: any[] }>(`/api/v1/products?search=${encodeURIComponent(query)}&limit=${MAX_PER_CATEGORY}`, { signal }),
    api.get<{ data: any[] }>(`/api/v1/invoices?search=${encodeURIComponent(query)}&limit=${MAX_PER_CATEGORY}`, { signal }),
    api.get<{ data: any[] }>(`/api/v1/quotations?search=${encodeURIComponent(query)}&limit=${MAX_PER_CATEGORY}`, { signal }),
    api.get<{ data: any[] }>(`/api/v1/expenses?search=${encodeURIComponent(query)}&limit=${MAX_PER_CATEGORY}`, { signal }),
  ]);

  // Customers
  if (customers.status === 'fulfilled' && customers.value.data.length > 0) {
    cats.push({
      ...CATEGORY_META.customers,
      category: 'customers',
      total: customers.value.data.length,
      items: customers.value.data.slice(0, MAX_PER_CATEGORY).map((c: any) => ({
        id: c.id,
        category: 'customers' as const,
        primary: c.name,
        secondary: c.companyName || c.email || c.phone || undefined,
        href: `/customers/${c.id}`,
      })),
    });
  }

  // Products
  if (products.status === 'fulfilled' && products.value.data.length > 0) {
    cats.push({
      ...CATEGORY_META.products,
      category: 'products',
      total: products.value.data.length,
      items: products.value.data.slice(0, MAX_PER_CATEGORY).map((p: any) => ({
        id: p.id,
        category: 'products' as const,
        primary: p.name,
        secondary: p.sku ? `SKU: ${p.sku}` : undefined,
        meta: `${fc(Number(p.unitPrice))}  |  Stock: ${p.quantity}`,
        href: '/inventory',
      })),
    });
  }

  // Invoices
  if (invoices.status === 'fulfilled' && invoices.value.data.length > 0) {
    cats.push({
      ...CATEGORY_META.invoices,
      category: 'invoices',
      total: invoices.value.data.length,
      items: invoices.value.data.slice(0, MAX_PER_CATEGORY).map((inv: any) => ({
        id: inv.id,
        category: 'invoices' as const,
        primary: inv.invoiceNumber,
        secondary: inv.customer?.name,
        meta: fc(Number(inv.total)),
        badge: {
          label: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
          color: STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-700',
        },
        href: `/invoices/${inv.id}`,
      })),
    });
  }

  // Quotations
  if (quotations.status === 'fulfilled' && quotations.value.data.length > 0) {
    cats.push({
      ...CATEGORY_META.quotations,
      category: 'quotations',
      total: quotations.value.data.length,
      items: quotations.value.data.slice(0, MAX_PER_CATEGORY).map((q: any) => ({
        id: q.id,
        category: 'quotations' as const,
        primary: q.quotationNumber,
        secondary: q.customerName || q.customer?.name,
        meta: fc(Number(q.total)),
        badge: {
          label: q.status.charAt(0).toUpperCase() + q.status.slice(1),
          color: STATUS_COLORS[q.status] || 'bg-gray-100 text-gray-700',
        },
        href: '/quotations',
      })),
    });
  }

  // Expenses
  if (expenses.status === 'fulfilled' && expenses.value.data.length > 0) {
    cats.push({
      ...CATEGORY_META.expenses,
      category: 'expenses',
      total: expenses.value.data.length,
      items: expenses.value.data.slice(0, MAX_PER_CATEGORY).map((e: any) => ({
        id: e.id,
        category: 'expenses' as const,
        primary: e.description,
        secondary: e.vendor?.name || e.reference || undefined,
        meta: fc(Number(e.amount)),
        href: '/expenses',
      })),
    });
  }

  return cats;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalSearch() {
  const router = useRouter();
  const { fc } = useCurrency();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [results, setResults] = useState<CategoryResults[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Detect macOS client-side only to avoid hydration mismatch (server always renders 'Ctrl')
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac/i.test(navigator.userAgent ?? ''));
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // -----------------------------------------------------------------------
  // Debounced search via API
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const apiResults = await searchViaApi(trimmedQuery.toLowerCase(), fc, controller.signal);
        if (!controller.signal.aborted) {
          setResults(apiResults);
          setIsSearching(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fc]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => results.flatMap((r) => r.items), [results]);

  // -----------------------------------------------------------------------
  // Keyboard shortcut: Cmd+K / Ctrl+K
  // -----------------------------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // -----------------------------------------------------------------------
  // Click outside
  // -----------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // -----------------------------------------------------------------------
  // Navigate to result
  // -----------------------------------------------------------------------
  const navigateTo = useCallback(
    (item: SearchResultItem) => {
      setIsOpen(false);
      setQuery('');
      setResults([]);
      router.push(item.href);
    },
    [router],
  );

  // -----------------------------------------------------------------------
  // Keyboard navigation within dropdown
  // -----------------------------------------------------------------------
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
        return;
      }

      if (!isOpen || flatItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < flatItems.length) {
        e.preventDefault();
        navigateTo(flatItems[activeIndex]);
      }
    },
    [isOpen, flatItems, activeIndex, navigateTo],
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // -----------------------------------------------------------------------
  // Determine dropdown state
  // -----------------------------------------------------------------------
  const showDropdown = isOpen;
  const hasQuery = query.trim().length >= 2;
  const hasResults = results.length > 0;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div ref={containerRef} className="relative">
      {/* ---- Desktop search input ---- */}
      <div className="hidden sm:flex items-center">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search invoices, customers, products..."
            className="w-64 lg:w-96 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-2 pl-10 pr-20 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 select-none">
            <span className="text-xs">{isMac ? '\u2318' : 'Ctrl'}</span>
            <span>K</span>
          </kbd>
        </div>
      </div>

      {/* ---- Mobile search button ---- */}
      <button
        className="sm:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-600" />
      </button>

      {/* ---- Mobile full-screen overlay ---- */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search..."
              autoFocus
              className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent focus:outline-none"
            />
            <button
              onClick={() => {
                setIsOpen(false);
                setQuery('');
                setResults([]);
              }}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderDropdownContent()}
          </div>
        </div>
      )}

      {/* ---- Desktop dropdown panel ---- */}
      {showDropdown && (
        <div className="hidden sm:block absolute left-0 top-full mt-2 w-[480px] lg:w-[560px] max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl dark:shadow-gray-900/40 ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {renderDropdownContent()}
        </div>
      )}
    </div>
  );

  // -----------------------------------------------------------------------
  // Dropdown content (shared between desktop & mobile)
  // -----------------------------------------------------------------------
  function renderDropdownContent() {
    // Empty state: not enough characters
    if (!hasQuery) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <MagnifyingGlassIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Type to search across customers, products, invoices, quotations, and expenses</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Minimum 2 characters</p>
        </div>
      );
    }

    // Loading state
    if (isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Searching...</p>
        </div>
      );
    }

    // No results
    if (!hasResults) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <MagnifyingGlassIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No results found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Try a different search term or check for typos
          </p>
        </div>
      );
    }

    // Results
    let globalIndex = -1;
    return (
      <div className="py-2">
        {results.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.category}>
              {/* Category header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-gray-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {cat.label}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">
                  {cat.total} result{cat.total !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items */}
              {cat.items.map((item) => {
                globalIndex += 1;
                const idx = globalIndex;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`${item.category}-${item.id}`}
                    onClick={() => navigateTo(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium truncate ${
                            isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {item.primary}
                        </span>
                        {item.badge && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${item.badge.color}`}
                          >
                            {item.badge.label}
                          </span>
                        )}
                      </div>
                      {item.secondary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {item.secondary}
                        </p>
                      )}
                    </div>
                    {item.meta && (
                      <span className="flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                        {item.meta}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Footer hint */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2 mt-1">
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
            <span>
              <kbd className="rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1 py-0.5 font-mono text-[10px]">&uarr;</kbd>{' '}
              <kbd className="rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1 py-0.5 font-mono text-[10px]">&darr;</kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1 py-0.5 font-mono text-[10px]">Enter</kbd>{' '}
              to open
            </span>
            <span>
              <kbd className="rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1 py-0.5 font-mono text-[10px]">Esc</kbd>{' '}
              to close
            </span>
          </div>
        </div>
      </div>
    );
  }
}
