import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import type { CartItem, Pizza, PizzaSize } from '../types';

interface MenuPageProps {
  onAddToCart: (item: CartItem) => void;
}

const SIZE_LABELS: Record<PizzaSize, string> = {
  MEDIUM: 'Medium',
  LARGE: 'Large',
  XL: 'XL',
};

export function MenuPage({ onAddToCart }: MenuPageProps) {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, PizzaSize>>(
    {}
  );
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadMenu() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts();
      setPizzas(data.products);
      setSelectedSizes((prev) => {
        const next = { ...prev };
        for (const pizza of data.products) {
          if (!next[pizza.id]) {
            const preferred =
              pizza.variants.find((v) => v.size === 'LARGE' && v.stock > 0) ??
              pizza.variants.find((v) => v.stock > 0) ??
              pizza.variants[0];
            if (preferred) next[pizza.id] = preferred.size;
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMenu();
  }, []);

  const categories = [
    'All',
    ...Array.from(new Set(pizzas.map((pizza) => pizza.category))),
  ];

  const visiblePizzas =
    activeCategory === 'All'
      ? pizzas
      : pizzas.filter((pizza) => pizza.category === activeCategory);

  function handleAdd(pizza: Pizza) {
    const size = selectedSizes[pizza.id] ?? pizza.variants[0]?.size;
    const variant = pizza.variants.find((v) => v.size === size);
    if (!variant || variant.stock <= 0) return;

    onAddToCart({
      productId: pizza.id,
      pizzaName: pizza.name,
      imageUrl: pizza.imageUrl,
      size: variant.size,
      unitPrice: variant.price,
      quantity: 1,
      maxStock: variant.stock,
    });
    setToast(`Added ${pizza.name} (${SIZE_LABELS[variant.size]}) to cart`);
  }

  return (
    <section aria-labelledby="menu-heading">
      <div className="hero-banner">
        <div>
          <h1 id="menu-heading">Stone-Baked Artisan Pizzas</h1>
          <p>
            Hand-stretched 48-hour sourdough, live kitchen inventory per size,
            and real-time order tracking from oven to doorstep.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadMenu()}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span>Refresh Stock</span>
        </button>
      </div>

      {toast && (
        <div
          className="alert alert-success"
          role="status"
          aria-live="polite"
          style={{ marginBlockEnd: '1.25rem' }}
        >
          {toast}
        </div>
      )}

      {error && (
        <div
          className="alert alert-error"
          role="alert"
          style={{ marginBlockEnd: '1.25rem' }}
        >
          {error}
        </div>
      )}

      <div className="toolbar-row">
        <div className="filter-pills" role="group" aria-label="Filter by category">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`pill-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Loading fresh pizzas...</p>
      ) : visiblePizzas.length === 0 ? (
        <div className="card-panel">
          <p style={{ margin: 0, color: 'var(--ink-muted)' }}>
            No pizzas available right now.
          </p>
        </div>
      ) : (
        <div className="pizza-grid">
          {visiblePizzas.map((pizza) => {
            const activeSize =
              selectedSizes[pizza.id] ?? pizza.variants[0]?.size;
            const activeVariant = pizza.variants.find(
              (v) => v.size === activeSize
            );
            const stock = activeVariant?.stock ?? 0;

            return (
              <article className="pizza-card" key={pizza.id}>
                <div className="pizza-media">
                  <img
                    src={pizza.imageUrl}
                    alt={pizza.name}
                    loading="lazy"
                  />
                  <span className="category-tag">{pizza.category}</span>
                </div>

                <div className="pizza-body">
                  <div>
                    <h2 className="pizza-title">{pizza.name}</h2>
                    <p className="pizza-desc">{pizza.description}</p>
                  </div>

                  <fieldset className="size-fieldset">
                    <legend>Choose size</legend>
                    <div className="size-options">
                      {pizza.variants.map((variant) => {
                        const inputId = `${pizza.id}-${variant.size}`;
                        return (
                          <div className="size-option" key={variant.id}>
                            <input
                              type="radio"
                              id={inputId}
                              name={`size-${pizza.id}`}
                              value={variant.size}
                              checked={activeSize === variant.size}
                              onChange={() =>
                                setSelectedSizes((prev) => ({
                                  ...prev,
                                  [pizza.id]: variant.size,
                                }))
                              }
                            />
                            <label htmlFor={inputId}>
                              <span>{SIZE_LABELS[variant.size]}</span>
                              <span>${variant.price.toFixed(2)}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="pizza-footer">
                    <span
                      className={`stock-badge ${
                        stock === 0
                          ? 'stock-out'
                          : stock <= 3
                            ? 'stock-low'
                            : 'stock-ok'
                      }`}
                    >
                      {stock === 0 ? 'Out of stock' : `${stock} remaining`}
                    </span>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={!activeVariant || stock === 0}
                      onClick={() => handleAdd(pizza)}
                    >
                      <Plus size={16} aria-hidden="true" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
