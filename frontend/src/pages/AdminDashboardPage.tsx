import { useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import type {
  NotificationRecord,
  Order,
  OrderStatus,
  Pizza,
  PizzaSize,
} from '../types';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'PREPARING',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
];

export function AdminDashboardPage() {
  const [tab, setTab] = useState<'orders' | 'menu' | 'notifications'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addDialogRef = useRef<HTMLDialogElement>(null);
  const [newPizza, setNewPizza] = useState({
    name: '',
    description: '',
    category: 'Classic',
    imageUrl: '',
    mediumPrice: '13.00',
    mediumStock: '10',
    largePrice: '17.00',
    largeStock: '8',
    xlPrice: '21.00',
    xlStock: '5',
  });

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, productsRes, notifRes] = await Promise.all([
        api.getAllOrders(statusFilter || undefined),
        api.getProducts(true),
        api.getNotifications(),
      ]);
      setOrders(ordersRes.orders);
      setPizzas(productsRes.products);
      setNotifications(notifRes.notifications);

      const initialStocks: Record<string, number> = {};
      for (const pizza of productsRes.products) {
        for (const variant of pizza.variants) {
          initialStocks[`${pizza.id}:${variant.size}`] = variant.stock;
        }
      }
      setStockEdits(initialStocks);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [statusFilter]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setError(null);
    setFeedback(null);
    try {
      await api.updateOrderStatus(orderId, status);
      setFeedback(
        `Order #${orderId.slice(0, 8).toUpperCase()} updated to ${status}`
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleSaveStock(pizzaId: string, size: PizzaSize) {
    const key = `${pizzaId}:${size}`;
    const qty = stockEdits[key] ?? 0;
    setError(null);
    setFeedback(null);
    try {
      await api.updateStock(pizzaId, size, qty);
      setFeedback(`Updated ${size} stock to ${qty}`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
    }
  }

  async function handleDeletePizza(pizzaId: string, name: string) {
    setError(null);
    setFeedback(null);
    try {
      await api.deleteProduct(pizzaId);
      setFeedback(`Removed ${name} from menu`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pizza');
    }
  }

  async function handleCreatePizza(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createProduct({
        name: newPizza.name,
        description: newPizza.description,
        category: newPizza.category,
        imageUrl: newPizza.imageUrl.trim() || undefined,
        variants: [
          {
            size: 'MEDIUM',
            price: Number(newPizza.mediumPrice),
            stock: Number(newPizza.mediumStock),
          },
          {
            size: 'LARGE',
            price: Number(newPizza.largePrice),
            stock: Number(newPizza.largeStock),
          },
          {
            size: 'XL',
            price: Number(newPizza.xlPrice),
            stock: Number(newPizza.xlStock),
          },
        ],
      });
      addDialogRef.current?.close();
      setFeedback(`Added "${newPizza.name}" to pizza menu`);
      setNewPizza({
        name: '',
        description: '',
        category: 'Classic',
        imageUrl: '',
        mediumPrice: '13.00',
        mediumStock: '10',
        largePrice: '17.00',
        largeStock: '8',
        xlPrice: '21.00',
        xlStock: '5',
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pizza');
    }
  }

  return (
    <section aria-labelledby="admin-heading">
      <div className="toolbar-row">
        <div>
          <h1
            id="admin-heading"
            style={{ fontFamily: 'var(--font-display)', margin: 0 }}
          >
            Shop Owner Console
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--ink-muted)' }}>
            Manage orders, pizza menu & stock levels, and notification logs.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadAll()}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span>Refresh All</span>
        </button>
      </div>

      {feedback && (
        <div
          className="alert alert-success"
          role="status"
          aria-live="polite"
          style={{ marginBlockEnd: '1rem' }}
        >
          {feedback}
        </div>
      )}
      {error && (
        <div
          className="alert alert-error"
          role="alert"
          style={{ marginBlockEnd: '1rem' }}
        >
          {error}
        </div>
      )}

      <div
        className="filter-pills"
        role="tablist"
        aria-label="Admin sections"
        style={{ marginBlockEnd: '1.5rem' }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'orders'}
          className={`pill-btn ${tab === 'orders' ? 'active' : ''}`}
          onClick={() => setTab('orders')}
        >
          Orders ({orders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'menu'}
          className={`pill-btn ${tab === 'menu' ? 'active' : ''}`}
          onClick={() => setTab('menu')}
        >
          Menu & Inventory ({pizzas.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'notifications'}
          className={`pill-btn ${tab === 'notifications' ? 'active' : ''}`}
          onClick={() => setTab('notifications')}
        >
          Notification Logs ({notifications.length})
        </button>
      </div>

      {tab === 'orders' && (
        <div className="card-panel">
          <div className="toolbar-row">
            <strong>Customer Orders</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="order-status-filter" style={{ fontWeight: 600 }}>
                Filter status:
              </label>
              <select
                id="order-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as OrderStatus | '')
                }
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--ink-muted)',
                        }}
                      >
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>{order.customerEmail}</td>
                    <td>
                      {order.items
                        .map(
                          (item) =>
                            `${item.pizzaName} (${item.size}) ×${item.quantity}`
                        )
                        .join(', ')}
                    </td>
                    <td>${order.totalAmount.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <select
                        aria-label={`Change status for order ${order.id.slice(0, 8)}`}
                        value={order.status}
                        onChange={(e) =>
                          void handleStatusChange(
                            order.id,
                            e.target.value as OrderStatus
                          )
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'menu' && (
        <div className="card-panel">
          <div className="toolbar-row">
            <strong>Menu & Size Inventory</strong>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => addDialogRef.current?.showModal()}
            >
              <Plus size={16} aria-hidden="true" />
              <span>Add New Pizza</span>
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pizza</th>
                  <th>Size Stock Controls</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pizzas.map((pizza) => (
                  <tr key={pizza.id}>
                    <td>
                      <strong>{pizza.name}</strong>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--ink-muted)',
                        }}
                      >
                        {pizza.category}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        {pizza.variants.map((variant) => {
                          const key = `${pizza.id}:${variant.size}`;
                          return (
                            <div
                              key={variant.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span style={{ minInlineSize: '125px' }}>
                                {variant.size} (${variant.price.toFixed(2)})
                              </span>
                              <input
                                type="number"
                                min={0}
                                aria-label={`${pizza.name} ${variant.size} stock`}
                                style={{ inlineSize: '78px', padding: '0.3rem 0.5rem' }}
                                value={stockEdits[key] ?? variant.stock}
                                onChange={(e) =>
                                  setStockEdits((prev) => ({
                                    ...prev,
                                    [key]: Number(e.target.value),
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() =>
                                  void handleSaveStock(pizza.id, variant.size)
                                }
                              >
                                Save
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() =>
                          void handleDeletePizza(pizza.id, pizza.name)
                        }
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card-panel">
          <strong style={{ display: 'block', marginBlockEnd: '1rem' }}>
            Notification Delivery Audit (RabbitMQ + Mailtrap)
          </strong>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((record) => (
                  <tr key={record.id}>
                    <td>{new Date(record.createdAt).toLocaleString()}</td>
                    <td>{record.eventType}</td>
                    <td>{record.recipient}</td>
                    <td>{record.subject}</td>
                    <td>
                      <span
                        className={`stock-badge ${
                          record.status === 'SENT' ? 'stock-ok' : 'stock-out'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <dialog ref={addDialogRef} aria-labelledby="add-pizza-title">
        <div className="dialog-header">
          <h1 id="add-pizza-title">Add New Pizza</h1>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Close modal"
            onClick={() => addDialogRef.current?.close()}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreatePizza}>
          <div className="dialog-body form-stack">
            <div className="form-field">
              <label htmlFor="pizza-name">Pizza Name</label>
              <input
                id="pizza-name"
                required
                minLength={2}
                value={newPizza.name}
                onChange={(e) =>
                  setNewPizza({ ...newPizza, name: e.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="pizza-desc">Description</label>
              <textarea
                id="pizza-desc"
                required
                minLength={5}
                rows={2}
                value={newPizza.description}
                onChange={(e) =>
                  setNewPizza({ ...newPizza, description: e.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="pizza-category">Category</label>
              <input
                id="pizza-category"
                required
                value={newPizza.category}
                onChange={(e) =>
                  setNewPizza({ ...newPizza, category: e.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="pizza-image">Image URL (optional)</label>
              <input
                id="pizza-image"
                type="url"
                value={newPizza.imageUrl}
                onChange={(e) =>
                  setNewPizza({ ...newPizza, imageUrl: e.target.value })
                }
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
              }}
            >
              <div className="form-field">
                <label htmlFor="med-price">Medium Price ($)</label>
                <input
                  id="med-price"
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={newPizza.mediumPrice}
                  onChange={(e) =>
                    setNewPizza({ ...newPizza, mediumPrice: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="med-stock">Medium Stock</label>
                <input
                  id="med-stock"
                  type="number"
                  min="0"
                  required
                  value={newPizza.mediumStock}
                  onChange={(e) =>
                    setNewPizza({ ...newPizza, mediumStock: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="lg-price">Large Price ($)</label>
                <input
                  id="lg-price"
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={newPizza.largePrice}
                  onChange={(e) =>
                    setNewPizza({ ...newPizza, largePrice: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="lg-stock">Large Stock</label>
                <input
                  id="lg-stock"
                  type="number"
                  min="0"
                  required
                  value={newPizza.largeStock}
                  onChange={(e) =>
                    setNewPizza({ ...newPizza, largeStock: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="xl-price">XL Price ($)</label>
                <input
                  id="xl-price"
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={newPizza.xlPrice}
                  onChange={(e) =>
                    setNewPizza({ ...newPizza, xlPrice: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="xl-stock">XL Stock</label>
                <input
                  id="xl-stock"
                  type="number"
                  min="0"
                  required
                  value={newPizza.xlStock}
                  onChange={(e) =>
                    setNewPizza({ ...newPizza, xlStock: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="dialog-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => addDialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Pizza
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
