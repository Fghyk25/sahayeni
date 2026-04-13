import { useState, useEffect, useCallback, useMemo } from 'react';

interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  isLoading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => void;
  setPageSize: (size: number) => void;
}

interface FetchFn<T> {
  (page: number, pageSize: number): Promise<{ items: T[]; total: number }>;
}

export function usePagination<T>(
  fetchFn: FetchFn<T>,
  options: PaginationOptions = {}
): PaginatedResult<T> {
  const { pageSize: initialPageSize = 20, initialPage = 1 } = options;
  
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);
  const hasNext = useMemo(() => page < totalPages, [page, totalPages]);
  const hasPrev = useMemo(() => page > 1, [page]);

  const fetchData = useCallback(async (pageNum: number, size: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn(pageNum, size);
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yüklenemedi');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetchData(page, pageSize);
  }, [page, pageSize, fetchData]);

  const goToPage = useCallback((pageNum: number) => {
    const validPage = Math.max(1, Math.min(pageNum, totalPages));
    setPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) setPage(p => p + 1);
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) setPage(p => p - 1);
  }, [hasPrev]);

  const refresh = useCallback(() => {
    fetchData(page, pageSize);
  }, [page, pageSize, fetchData]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNext,
    hasPrev,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}
