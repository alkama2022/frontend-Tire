// src/routes/admin.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { api, type Paginated, type Product, type Brand, type Category, type Review, type Cart, type SentCartMessage } from "@/lib/api";
import { ProtectedRoute } from "../components/ProtectedRoute";

export const Route = createFileRoute("/admin")({
  component: () => (
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  ),
  head: () => ({
    meta: [
      { title: "Admin — Apex Tyres" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type TabKey =
  | "products"
  | "brands"
  | "categories"
  | "reviews"
  | "customers"
  | "orders"
  | "carts"
  | "messages";

const TABS: { key: TabKey; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "brands", label: "Brands" },
  { key: "categories", label: "Categories" },
  { key: "reviews", label: "Reviews" },
  { key: "customers", label: "Customers" },
  { key: "orders", label: "Orders" },
  { key: "carts", label: "Carts" },
  { key: "messages", label: "Messages" },
];

function AdminPage() {
  const [tab, setTab] = useState<TabKey>("products");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl uppercase">
        Admin <span className="text-primary">Dashboard</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Read-only overview mirroring the Django admin. Use Django admin for edits.
      </p>

      <StatsRow />

      <div className="mt-8 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-semibold uppercase tracking-widest transition ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "products" && <ProductsTable />}
        {tab === "brands" && <BrandsTable />}
        {tab === "categories" && <CategoriesTable />}
        {tab === "reviews" && <ReviewsTable />}
        {tab === "customers" && <CustomersTable />}
        {tab === "orders" && <OrdersTable />}
        {tab === "carts" && <CartsTable />}
        {tab === "messages" && <MessagesTable />}
      </div>
    </div>
  );
}

// ---------- Stats ----------
function StatsRow() {
  const products = useQuery({
    queryKey: ["admin-count", "products"],
    queryFn: () => api<Paginated<Product>>(`/products/?page_size=1`),
  });
  const brands = useQuery({
    queryKey: ["admin-count", "brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/brands/`),
  });
  const orders = useQuery({
    queryKey: ["admin-count", "orders"],
    queryFn: () => api<Paginated<any> | any[]>(`/orders/?page_size=1`),
    retry: false,
  });
  const messages = useQuery({
    queryKey: ["admin-count", "messages"],
    queryFn: () => api<Paginated<any> | any[]>(`/messages/?page_size=1`),
    retry: false,
  });

  const productsCount = products.data?.count ?? products.data?.results?.length ?? 0;
  const brandsCount = Array.isArray(brands.data)
    ? brands.data.length
    : brands.data?.count ?? brands.data?.results?.length ?? 0;
  const ordersCount = Array.isArray(orders.data) ? orders.data.length : orders.data?.count ?? 0;
  const messagesCount = Array.isArray(messages.data) ? messages.data.length : messages.data?.count ?? 0;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Products" value={productsCount} loading={products.isLoading} />
      <StatCard label="Brands" value={brandsCount} loading={brands.isLoading} />
      <StatCard label="Orders" value={ordersCount} loading={orders.isLoading} error={orders.isError} />
      <StatCard label="Messages" value={messagesCount} loading={messages.isLoading} error={messages.isError} />
    </div>
  );
}

function StatCard({ label, value, loading, error }: { label: string; value: number; loading?: boolean; error?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl text-primary">
        {loading ? "…" : error ? "—" : value.toLocaleString()}
      </div>
    </div>
  );
}

// ---------- Shared table shell ----------
function TableShell({ columns, loading, error, empty, children }: { columns: string[]; loading?: boolean; error?: boolean; empty?: boolean; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">
                Loading…
              </td>
            </tr>
          )}
          {error && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-destructive">
                Failed to load (endpoint may require auth).
              </td>
            </tr>
          )}
          {!loading && !error && empty && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">
                Nothing to show.
              </td>
            </tr>
          )}
          {children}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Products ----------
function ProductsTable() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-products", search],
    queryFn: () =>
      api<Paginated<Product>>(`/products/`, {
        params: { ordering: "-id", search: search || undefined, page_size: 50 },
      }),
  });
  const rows = q.data?.results ?? [];
  return (
    <>
      <div className="mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full max-w-sm rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <TableShell columns={["ID", "Model", "Brand", "Category", "Size", "Stock", "Price"]} loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
        {rows.map((p) => (
          <tr key={p.id} className="border-t border-border">
            <td className="px-4 py-3 text-muted-foreground">#{p.id}</td>
            <td className="px-4 py-3 font-semibold">{p.model_name}</td>
            <td className="px-4 py-3">{p.brand}</td>
            <td className="px-4 py-3">{p.category}</td>
            <td className="px-4 py-3">
              {p.width}/{p.aspect_ratio} R{p.rim_diameter}
            </td>
            <td className="px-4 py-3">
              <StockBadge n={p.inventory} />
            </td>
            <td className="px-4 py-3 font-display text-primary">₦{p.price}</td>
          </tr>
        ))}
      </TableShell>
    </>
  );
}

function StockBadge({ n }: { n: number }) {
  if (n === 0) return <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Out</span>;
  if (n < 10) return <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-500">Low ({n})</span>;
  return <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">{n}</span>;
}

// ---------- Brands ----------
function BrandsTable() {
  const q = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/brands/`),
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell columns={["ID", "Name", "Products"]} loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
      {rows.map((b) => (
        <tr key={b.id} className="border-t border-border">
          <td className="px-4 py-3 text-muted-foreground">#{b.id}</td>
          <td className="px-4 py-3 font-semibold">{b.name}</td>
          <td className="px-4 py-3">{b.products_count ?? "—"}</td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------- Categories ----------
function CategoriesTable() {
  const q = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api<Paginated<Category> | Category[]>(`/categories/`),
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell columns={["ID", "Name", "Products"]} loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
      {rows.map((c) => (
        <tr key={c.id} className="border-t border-border">
          <td className="px-4 py-3 text-muted-foreground">#{c.id}</td>
          <td className="px-4 py-3 font-semibold">{c.name}</td>
          <td className="px-4 py-3">{c.products_count ?? "—"}</td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------- Reviews ----------
type AdminReview = Review & { product?: number; date?: string };
function ReviewsTable() {
  const products = useQuery({
    queryKey: ["admin-products-for-reviews"],
    queryFn: () => api<Paginated<Product>>(`/products/?page_size=50&ordering=-id`),
  });
  const productList = products.data?.results ?? [];
  return (
    <TableShell columns={["Product", "Name", "Review"]} loading={products.isLoading} error={products.isError} empty={productList.length === 0}>
      {productList.map((p) => (
        <ProductReviews key={p.id} product={p} />
      ))}
    </TableShell>
  );
}
function ProductReviews({ product }: { product: Product }) {
  const q = useQuery({
    queryKey: ["admin-reviews", product.id],
    queryFn: () => api<Paginated<AdminReview> | AdminReview[]>(`/products/${product.id}/reviews/`),
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map((r) => (
        <tr key={`${product.id}-${r.id}`} className="border-t border-border">
          <td className="px-4 py-3 font-semibold">{product.model_name}</td>
          <td className="px-4 py-3">{r.name}</td>
          <td className="px-4 py-3 text-muted-foreground">{r.description}</td>
        </tr>
      ))}
    </>
  );
}

// ---------- Customers ----------
type AdminCustomer = {
  id: number;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  membership?: string;
  birth_date?: string | null;
};
function CustomersTable() {
  const q = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => api<Paginated<AdminCustomer> | AdminCustomer[]>(`/customers/`),
    retry: false,
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell columns={["ID", "Name", "Email", "Phone", "Membership"]} loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
      {rows.map((c) => (
        <tr key={c.id} className="border-t border-border">
          <td className="px-4 py-3 text-muted-foreground">#{c.id}</td>
          <td className="px-4 py-3 font-semibold">
            {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
          </td>
          <td className="px-4 py-3">{c.email || "—"}</td>
          <td className="px-4 py-3">{c.phone_number || "—"}</td>
          <td className="px-4 py-3 uppercase tracking-widest text-xs">{c.membership || "—"}</td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------- Orders ----------
type AdminOrder = {
  id: number;
  customer?: number | { id: number; first_name?: string; last_name?: string };
  payment_status?: string;
  placed_at?: string;
  items?: { id: number; quantity: number; unit_price: string | number }[];
};
function OrdersTable() {
  const q = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => api<Paginated<AdminOrder> | AdminOrder[]>(`/orders/`),
    retry: false,
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell columns={["ID", "Customer", "Status", "Items", "Total", "Placed"]} loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
      {rows.map((o) => {
        const items = o.items ?? [];
        const total = items.reduce((s: number, it: any) => s + Number(it.unit_price) * it.quantity, 0);
        const customer = typeof o.customer === "object" && o.customer
          ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") || `#${o.customer.id}`
          : o.customer
            ? `#${o.customer}`
            : "—";
        return (
          <tr key={o.id} className="border-t border-border">
            <td className="px-4 py-3 text-muted-foreground">#{o.id}</td>
            <td className="px-4 py-3 font-semibold">{customer}</td>
            <td className="px-4 py-3 uppercase tracking-widest text-xs">{o.payment_status || "—"}</td>
            <td className="px-4 py-3">{items.length}</td>
            <td className="px-4 py-3 font-display text-primary">₦{total.toFixed(2)}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">
              {o.placed_at ? new Date(o.placed_at).toLocaleString() : "—"}
            </td>
          </tr>
        );
      })}
    </TableShell>
  );
}

// ---------- Carts ----------
function CartsTable() {
  const q = useQuery({
    queryKey: ["admin-carts"],
    queryFn: () => api<Paginated<Cart> | Cart[]>(`/carts/`),
    retry: false,
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell columns={["Cart ID", "Items", "Total"]} loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
      {rows.map((c) => (
        <tr key={c.id} className="border-t border-border">
          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.id}</td>
          <td className="px-4 py-3">{c.items?.length ?? 0}</td>
          <td className="px-4 py-3 font-display text-primary">₦{Number(c.total_price ?? 0).toFixed(2)}</td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------- Messages ----------
function MessagesTable() {
  const q = useQuery({
    queryKey: ["admin-messages"],
    queryFn: () => api<Paginated<SentCartMessage> | SentCartMessage[]>(`/messages/`),
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <div className="space-y-3">
      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {q.isError && (
        <p className="text-sm text-destructive">Failed to load messages (admin auth may be required).</p>
      )}
      {rows.map((m) => (
        <div key={m.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-semibold">{m.contact_name}</div>
              <div className="text-xs text-muted-foreground">
                {m.contact_phone} · {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
            <div className="font-display text-xl text-primary">₦{Number(m.total_price).toFixed(2)}</div>
          </div>
          {m.contact_note && <p className="mt-2 text-sm text-muted-foreground">{m.contact_note}</p>}
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background p-3 text-xs text-muted-foreground">{m.message_text}</pre>
          {m.whatsapp_url && (
            <a href={m.whatsapp_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold uppercase tracking-widest text-primary hover:underline">
              Open WhatsApp →
            </a>
          )}
        </div>
      ))}
      {!q.isLoading && rows.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
    </div>
  );
}
