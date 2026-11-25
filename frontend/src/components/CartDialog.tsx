import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import type { CartItem, User } from '../types';
import { api } from '../api/client';

interface CartDialogProps {
  open: boolean;
  items: CartItem[];
  user: User | null;
  onClose: () => void;
  onUpdateQty: (productId: string, size: CartItem['size'], qty: number) => void;
  onRemoveItem: (productId: string, size: CartItem['size']) => void;
  onOrderSuccess: () => void;
}

export function CartDialog({
  open,
  items,
  user,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onOrderSuccess,
}: CartDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setError(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const total = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate('/auth');
      return;
    }
    if (items.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.placeOrder(
        items.map((item) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        })),
        notes.trim() || undefined
      );
      setNotes('');
      onOrderSuccess();
      onClose();
      navigate('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cart-dialog-title"
      onClose={onClose}
    >
      <div className="dialog-header">
        <h1 id="cart-dialog-title">Your Pizza Order</h1>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Close cart"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleCheckout}>
        <div className="dialog-body">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          {items.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)' }}>
              Your cart is empty. Pick a wood-fired pizza from the menu to get
              started.
            </p>
          ) : (
            <>
              {items.map((item) => (
                <div
                  className="cart-row"
                  key={`${item.productId}-${item.size}`}
                >
                  <div>
                    <strong>{item.pizzaName}</strong>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--ink-muted)',
                      }}
                    >
                      Size: {item.size} · ${item.unitPrice.toFixed(2)} each
                    </div>
                  </div>

                  <div className="qty-controls">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      aria-label={`Decrease quantity of ${item.pizzaName}`}
                      onClick={() =>
                        onUpdateQty(
                          item.productId,
                          item.size,
                          item.quantity - 1
                        )
                      }
                    >
                      <Minus size={14} />
                    </button>
                    <span
                      style={{ minInlineSize: '1.5rem', textAlign: 'center' }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      aria-label={`Increase quantity of ${item.pizzaName}`}
                      disabled={item.quantity >= item.maxStock}
                      onClick={() =>
                        onUpdateQty(
                          item.productId,
                          item.size,
                          item.quantity + 1
                        )
                      }
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      aria-label={`Remove ${item.pizzaName}`}
                      onClick={() => onRemoveItem(item.productId, item.size)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="form-field" style={{ marginBlockStart: '1rem' }}>
                <label htmlFor="order-notes">Delivery / Kitchen Notes</label>
                <textarea
                  id="order-notes"
                  name="notes"
                  rows={2}
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional: extra crispy crust, ring doorbell..."
                />
              </div>
            </>
          )}
        </div>

        <div className="dialog-footer">
          <strong style={{ marginInlineEnd: 'auto', alignSelf: 'center' }}>
            Total: ${total.toFixed(2)}
          </strong>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            autoFocus={items.length === 0}
          >
            Keep Browsing
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={items.length === 0 || submitting}
          >
            {!user
              ? 'Sign in to Order'
              : submitting
                ? 'Submitting...'
                : `Place Order ($${total.toFixed(2)})`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
