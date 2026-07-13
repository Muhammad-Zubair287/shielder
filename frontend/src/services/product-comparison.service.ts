const STORAGE_KEY = 'shielder_compare_products';
const MAX_COMPARE_PRODUCTS = 3;

export type ComparedProductItem = {
  id: string;
  name: string;
  nameEn?: string;
  nameAr?: string;
  price: number;
  sku?: string;
  thumbnail?: string | null;
  filterType?: string;
  material?: string;
  dimensions?: string;
};

function readStorage(): ComparedProductItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ComparedProductItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_COMPARE_PRODUCTS);
  } catch {
    return [];
  }
}

function writeStorage(items: ComparedProductItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_COMPARE_PRODUCTS)));
}

export const productComparisonService = {
  getAll(): ComparedProductItem[] {
    return readStorage();
  },

  isCompared(productId: string): boolean {
    return readStorage().some((item) => item.id === productId);
  },

  add(item: ComparedProductItem): { ok: boolean; reason?: 'limit_reached' } {
    const current = readStorage();
    if (current.some((existing) => existing.id === item.id)) {
      return { ok: true };
    }

    if (current.length >= MAX_COMPARE_PRODUCTS) {
      return { ok: false, reason: 'limit_reached' };
    }

    writeStorage([...current, item]);
    return { ok: true };
  },

  remove(productId: string): void {
    const current = readStorage();
    writeStorage(current.filter((item) => item.id !== productId));
  },

  clear(): void {
    writeStorage([]);
  },

  maxItems: MAX_COMPARE_PRODUCTS,
};
