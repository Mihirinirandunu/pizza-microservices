import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import type { Order, OrderStatus } from '../types';

const FLOW_STEPS: OrderStatus[] = [
  'PENDING',
  'PREPARING',
  'DELIVERING',
  'COMPLETED',
];

export function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyOrders();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <section aria-labelledby="my-orders-heading">
      <div className="toolbar-row">
        <div>
          <h1
            id="my-orders-heading"
            style={{ fontFamily: 'var(--font-display)', margin: 0 }}
          >
            My Orders
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--ink-muted)' }}>
            Track live kitchen progress and confirmation status.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadOrders()}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className="card-panel">
          <p style={{ margin: 0, color: 'var(--ink-muted)' }}>
            You have not placed any pizza orders yet.
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const currentIdx = FLOW_STEPS.indexOf(order.status);
            return (
              <article className="card-panel" key={order.id}>
                <div className="order-header">
                  <div>
                    <strong>
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </strong>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--ink-muted)',
                      }}
                    >
                      Placed {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <strong>${order.totalAmount.toFixed(2)}</strong>
                    <span className={`status-badge status-${order.status}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {order.status !== 'CANCELLED' && (
                  <ol className="stepper" aria-label="Order progress">
                    {FLOW_STEPS.map((step, index) => {
                      const stateClass =
                        index < currentIdx
                          ? 'done'
                          : index === currentIdx
                            ? 'current'
                            : '';
                      return (
                        <li
                          key={step}
                          className={`step-node ${stateClass}`}
                          aria-current={
                            index === currentIdx ? 'step' : undefined
                          }
                        >
                          {step}
                        </li>
                      );
                    })}
                  </ol>
                )}

                <ul style={{ margin: '0.5rem 0 0', paddingInlineStart: '1.2rem' }}>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.pizzaName} ({item.size}) × {item.quantity} — $
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </li>
                  ))}
                </ul>

                {order.notes && (
                  <p
                    style={{
                      margin: '0.65rem 0 0',
                      fontSize: '0.88rem',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    Note: {order.notes}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
