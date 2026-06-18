import { useEffect, useState } from "react";

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  // top-level type used for the left-side toggle
  category: "food" | "drinks";
  // more specific grouping/category string coming from the API
  section?: string;
  image?: string;
};

type CartItem = MenuItem & { quantity: number };

const mockMenu: MenuItem[] = [
  { id: "f1", name: "Cheeseburger", description: "Beef, cheese, lettuce", price: 8.5, category: "food", section: "Burgers" },
  { id: "f2", name: "Veggie Burger", description: "Plant-based patty", price: 9.0, category: "food", section: "Burgers" },
  { id: "f3", name: "Fries", description: "Crispy salted fries", price: 3.0, category: "food", section: "Sides" },
  { id: "f4", name: "Caesar Salad", description: "Romaine, parmesan", price: 7.0, category: "food", section: "Salads" },
  { id: "d1", name: "Cola", description: "Chilled soda", price: 2.5, category: "drinks", section: "Cold Drinks" },
  { id: "d2", name: "Orange Juice", description: "Fresh squeezed", price: 3.5, category: "drinks", section: "Cold Drinks" },
  { id: "d3", name: "Coffee", description: "Hot brewed", price: 2.0, category: "drinks", section: "Hot Drinks" },
];

export default function Orders({ tableId, sessionId }: { tableId?: string; sessionId?: string }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<"food" | "drinks">("food");
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchMenu() {
      try {
        const res = await fetch("http://localhost:3000/api/menu");
        if (!res.ok) throw new Error("no remote menu");
        const data = await res.json();
        if (!cancelled) setMenu(data);
      } catch (err) {
        // fallback to mock
        if (!cancelled) setMenu(mockMenu);
      }
    }
    fetchMenu();
    return () => {
      cancelled = true;
    };
  }, []);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((p) => p.id !== id));
  }

  function changeQty(id: string, qty: number) {
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, qty) } : p)));
  }

  const total = cart.reduce((s, it) => s + it.price * it.quantity, 0);

  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; text?: string | null }>({ type: null, text: null });

  async function placeOrder() {
    if (cart.length === 0) return;
    setOrderStatus("Sending order...");
    try {
      const payload = {
        tableId: tableId || null,
        sessionId: sessionId || null,
        items: cart.map(({ id, name, price, quantity, section, category }) => ({ id, name, price, quantity, section, category })),
        total,
        placedAt: new Date().toISOString(),
      };

      const res = await fetch('https://vmi3024163.contaboserver.net/webhook/b602f6aa-04c9-4769-826b-26f08a63da72', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let body: any = null;
      try {
        body = await res.json();
      } catch (e) {
        // ignore JSON parse errors
      }

      const serverResp = body?.response || body?.data?.response || null;
      const respKey = typeof serverResp === 'string' ? serverResp.toLowerCase() : null;

      if (!res.ok) {
        // treat as backend error
        const message = respKey === 'expired' ? 'Session expired! Please scan the QR code again' : 'Something went wrong please try again!';
        setFeedback({ type: 'error', text: message });
      } else {
        // res.ok
        if (respKey === 'success' || respKey == null) {
          setFeedback({ type: 'success', text: 'Order placed successfully' });
          setCart([]);
        } else if (respKey === 'expired') {
          setFeedback({ type: 'error', text: 'Session expired! Please scan the QR code again' });
        } else if (respKey === 'error') {
          setFeedback({ type: 'error', text: 'Something went wrong please try again!' });
        } else {
          // unknown but successful
          setFeedback({ type: 'success', text: String(serverResp) });
          setCart([]);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Something went wrong please try again!' });
    }
    setTimeout(() => setOrderStatus(null), 4000);
    setTimeout(() => setFeedback({ type: null, text: null }), 6000);
  }

  return (
    <div className="orders-root" style={{ padding: 16 }}>
      <div className="orders-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setCategory("food")}
            style={{ padding: "8px 12px", background: category === "food" ? "#111827" : "#f3f4f6", color: category === "food" ? "white" : "black", borderRadius: 6, border: "none" }}
          >
            Food
          </button>
          <button
            onClick={() => setCategory("drinks")}
            style={{ padding: "8px 12px", background: category === "drinks" ? "#111827" : "#f3f4f6", color: category === "drinks" ? "white" : "black", borderRadius: 6, border: "none" }}
          >
            Drinks
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Menu</div>
          <button
            onClick={() => setCartOpen((s) => !s)}
            aria-label="Open cart"
            style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6h15l-1.5 9h-12z" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
            {cart.length > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "white", borderRadius: 999, padding: "2px 6px", fontSize: 12 }}>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            )}
          </button>
        </div>
      </div>
      {/* feedback banner moved into cart panel so user sees it with order details */}

      <div className="orders-menu" style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8 }}>
        {(() => {
          const items = menu.filter((m) => m.category === category);
          const grouped: Record<string, MenuItem[]> = {};
          items.forEach((it) => {
            const key = it.section || 'Other';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(it);
          });

          return Object.entries(grouped).map(([section, itemsInSection]) => (
            <div key={section} className="orders-section">
              <div className="orders-section-title" style={{ fontWeight: 700, marginBottom: 8 }}>{section}</div>
              <div className="orders-section-row" style={{ display: 'flex', gap: 12, overflowX: 'auto'}}>
                {itemsInSection.map((item) => (
                  <div key={item.id} className="orders-card" style={{ minWidth: 220, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: "#6b7280" }}>${item.price.toFixed(2)}</div>
                    </div>
                    {item.description && <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>{item.description}</div>}
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => addToCart(item)} style={{ padding: "6px 10px", background: "#10b981", color: "white", border: "none", borderRadius: 6 }}>Add</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      {cartOpen && (
        <div className="orders-cart" style={{ position: "fixed", top: 60, right: 16, width: 360, maxHeight: "70vh", overflowY: "auto", background: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", borderRadius: 8, padding: 12, zIndex: 60 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>Your Cart</div>
            <button onClick={() => setCartOpen(false)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>Close</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feedback.type && (
              <div style={{ marginBottom: 8, padding: 10, borderRadius: 6, background: feedback.type === 'success' ? '#ecfdf5' : '#fff1f2', color: feedback.type === 'success' ? '#065f46' : '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>{feedback.text}</div>
                <button onClick={() => setFeedback({ type: null, text: null })} style={{ marginLeft: 12, background: 'transparent', border: 'none', cursor: 'pointer' }}>Close</button>
              </div>
            )}

            {cart.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Cart is empty</div>
            ) : (
              <>
                {cart.map((it) => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #f3f4f6", padding: 8, borderRadius: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>${it.price.toFixed(2)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input aria-label="qty" type="number" value={it.quantity} onChange={(e) => changeQty(it.id, Number(e.target.value) || 1)} style={{ width: 56, padding: 6 }} />
                      <button onClick={() => removeFromCart(it.id)} style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 8px", borderRadius: 6 }}>Remove</button>
                    </div>
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 6 }}>
                  <div>Total</div>
                  <div>${total.toFixed(2)}</div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <button onClick={async () => { await placeOrder(); setCartOpen(true); }} disabled={cart.length === 0} style={{ flex: 1, padding: '10px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6 }}>Place Order</button>
                  <div style={{ minWidth: 120, textAlign: 'right', color: '#374151' }}>{orderStatus || ''}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
