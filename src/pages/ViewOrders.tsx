import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import DashboardNav from '../components/DashboardNav';

type OrderRow = {
  id: string;
  table_id: string | null;
  session_id: string | null;
  items: any; // stored JSON in supabase
  total: number;
  created_at: string;
  _isNew?: boolean;
};

type OrderItem = {
  id?: string;
  name?: string;
  price?: number;
  section?: string;
  category?: string;
  quantity?: number;
};

type TableRow = {
  id: string;
  table_number: string;
  active: boolean;
};

export default function ViewOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tab, setTab] = useState<'orders' | 'tables'>('orders');
  const [loadingTables, setLoadingTables] = useState(false);
  const mounted = useRef(false);
  // Fetch tables when tab is switched to 'tables'
  useEffect(() => {
    if (tab !== 'tables') return;
    setLoadingTables(true);
    supabase.from('tables').select('*').then(({ data, error }) => {
      setLoadingTables(false);
      if (error) return;
      setTables(data || []);
    });
  }, [tab]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('logout failed', e);
    }
    navigate('/');
  }

  useEffect(() => {
    mounted.current = true;

    async function load() {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to load orders', error);
        return;
      }
      if (mounted.current) setOrders((data as OrderRow[]) || []);
    }

    load();

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const newRow = payload.new as OrderRow;
        newRow._isNew = true;
        // Prepend
        setOrders((prev) => [newRow, ...(prev || [])]);
        // play notification sound
        playBeep();
        // clear new marker after a while
        setTimeout(() => {
          setOrders((prev) => prev.map((r) => (r.id === newRow.id ? { ...r, _isNew: false } : r)));
        }, 6000);
      })
      .subscribe((
status
) =>
 
console
.log(
'realtime status'
, status));

    return () => {
      mounted.current = false;
      // unsubscribe channel
      try {
        channel.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  function playBeep() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.02;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        try { ctx.close(); } catch (e) {}
      }, 180);
    } catch (e) {
      // fallback: do nothing
    }
  }

  return (
    <div>
      <DashboardNav activeTab="orders" onTabChange={() => navigate('/dashboard')} onLogout={handleLogout} />
      <div className="view-orders-root">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
          <button
            className={`dashboard-tab${tab === 'orders' ? ' active' : ''}`}
            style={{ borderRadius: '8px 8px 0 0' }}
            onClick={() => setTab('orders')}
          >
            Orders
          </button>
          <button
            className={`dashboard-tab${tab === 'tables' ? ' active' : ''}`}
            style={{ borderRadius: '8px 8px 0 0' }}
            onClick={() => setTab('tables')}
          >
            Tables
          </button>
        </div>

        {tab === 'orders' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            {orders.map((o) => (
              <div key={o.id} className="order-card" style={{ position: 'relative', padding: 12, borderRadius: 8, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', border: '1px solid #e6e6e6' }}>
                {o._isNew && <span className="new-dot" aria-hidden style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderRadius: 999, background: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.08)' }} />}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>Table: {o.table_id ?? '—'}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{new Date(o.created_at).toLocaleString()}</div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ color: '#374151', fontWeight: 600, marginBottom: 6 }}>Items</div>
                  <div style={{ fontSize: 14, color: '#374151' }}>
                    {(() => {
                      let itemsList: OrderItem[] = [];
                      if (Array.isArray(o.items)) itemsList = o.items as OrderItem[];
                      else if (o.items && Array.isArray(o.items.data)) itemsList = o.items.data as OrderItem[];
                      else if (typeof o.items === 'string') {
                        try {
                          const parsed = JSON.parse(o.items);
                          if (Array.isArray(parsed)) itemsList = parsed;
                          else if (parsed && Array.isArray(parsed.data)) itemsList = parsed.data;
                        } catch (e) {
                          itemsList = [];
                        }
                      }

                      if (!itemsList || itemsList.length === 0) {
                        return <div style={{ fontSize: 13, color: '#6b7280' }}>No items</div>;
                      }

                      return (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {itemsList.map((it: OrderItem, idx: number) => (
                            <li key={idx} style={{ marginBottom: 4 }}>
                              <span style={{ fontWeight: 600 }}>{it.name ?? 'Item'}</span>
                              <span style={{ color: '#6b7280' }}> — {it.quantity ?? 1} × ${Number(it.price ?? 0).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800 }}>${Number(o.total ?? 0).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tables' && (
          <div style={{ maxWidth: 600, margin: '0 auto', background: 'white', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24 }}>
            <h3 style={{ marginBottom: 18 }}>Table Statuses</h3>
            {loadingTables ? (
              <div>Loading tables...</div>
            ) : tables.length === 0 ? (
              <div>No tables found.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {tables.map((t) => (
                  <li key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontWeight: 600 }}>Masa {t.table_number}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!t.active}
                        onChange={async (e) => {
                          const newActive = e.target.checked;
                          setTables((prev) => prev.map((row) => row.id === t.id ? { ...row, active: newActive } : row));
                          await supabase.from('tables').update({ active: newActive }).eq('id', t.id);
                        }}
                        style={{ width: 32, height: 20 }}
                      />
                      <span style={{ color: t.active ? '#10b981' : '#ef4444', fontWeight: 500 }}>{t.active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
