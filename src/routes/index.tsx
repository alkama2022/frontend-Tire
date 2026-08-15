import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type Brand, type Paginated, type Product } from "@/lib/api";
import { ArrowRight, ShieldCheck, Truck, Wrench, PackageOpen, CircleDashed } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async ({ context: { queryClient } }) => {
    queryClient.ensureQueryData({
      queryKey: ["featured-products"],
      queryFn: () => api<Paginated<Product> | Product[]>(`/products/?ordering=-id`),
    });
    queryClient.ensureQueryData({
      queryKey: ["home-brands"],
      queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`),
    });
  },
});

function Home() {
  const featured = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => api<Paginated<Product> | Product[]>(`/products/?ordering=-id`),
  });
  const brands = useQuery({
    queryKey: ["home-brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`),
  });

  // Optional: log errors without blocking UI
  if (featured.isError) {
    console.error("Failed to load featured products:", featured.error);
  }
  if (brands.isError) {
    console.error("Failed to load brands:", brands.error);
  }

  const products =
    (Array.isArray(featured.data) ? featured.data : featured.data?.results ?? []).slice(0, 6);
  const brandList = Array.isArray(brands.data) ? brands.data : brands.data?.results ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 diagonal-stripes opacity-40" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Season Launch · 2026
            </span>
            <h1 className="font-display text-5xl uppercase leading-none tracking-wide sm:text-7xl">
              Grip the road.
              <br />
              <span className="text-primary">Own the drive.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base text-muted-foreground">
              Performance tyres from the brands you trust — matched to your car, delivered fast,
              fitted by pros.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
              >
                Shop tyres <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold uppercase tracking-widest hover:border-primary hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
              >
                Find my size
              </Link>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="relative aspect-square w-full max-w-md">
              <div className="absolute inset-0 rounded-full border-[24px] border-foreground/90" />
              <div className="absolute inset-8 rounded-full border-[10px] border-primary/80" />
              <div className="absolute inset-16 rounded-full border-4 border-dashed border-foreground/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-6xl text-primary">APEX</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USPs */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
          {[
            { icon: Truck, title: "Fast dispatch", body: "In-stock orders ship same day." },
            { icon: ShieldCheck, title: "Genuine brands", body: "Only authentic, warrantied tyres." },
            { icon: Wrench, title: "Expert fitment", body: "Certified installers in your city." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="rounded-md bg-primary/10 p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wide">{title}</div>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl uppercase sm:text-4xl">
            Fresh <span className="text-primary">rubber</span>
          </h2>
          <Link to="/products" className="text-sm font-semibold uppercase tracking-widest hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-surface" />
          ))}
          {products.map((p, index) => (
            <ProductCard key={p.id} product={p} isLcp={index < 2} />
          ))}
          {!featured.isLoading && products.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <PackageOpen className="mb-4 h-10 w-10 text-muted-foreground/30" />
              <p className="text-lg font-semibold text-foreground">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">Check back later for new arrivals.</p>
            </div>
          )}
        </div>
      </section>

      {/* Brands */}
      {brandList.length > 0 && (
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Brands we carry
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {brandList.map((b) => (
                <Link
                  key={b.id}
                  to="/products"
                  search={{ brand: b.id }}
                  className="rounded-md border border-border px-4 py-2 font-display text-xl uppercase tracking-wide hover:border-primary hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export function ProductCard({ product, isLcp }: { product: Product; isLcp?: boolean }) {
  const img = product.images?.find((i) => i.is_primary) || product.images?.[0];
  return (
    <Link
      to="/products/$id"
      params={{ id: String(product.id) }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        {img ? (
          <img
            src={img.image}
            alt={product.model_name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading={isLcp ? undefined : "lazy"}
            fetchPriority={isLcp ? "high" : undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/30">
            <CircleDashed className="h-20 w-20" />
          </div>
        )}
        <div className="absolute left-3 top-3 rounded bg-background/90 px-2 py-1 text-xs font-semibold uppercase tracking-wider">
          {product.brand}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {product.category}
        </div>
        <div className="mt-1 font-display text-xl uppercase leading-tight">
          {product.model_name}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {product.width}/{product.aspect_ratio} R{product.rim_diameter} · {product.load_index}
          {product.speed_rating}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-display text-2xl text-primary">₦{product.price}</span>
          <span className="text-xs uppercase tracking-widest text-foreground/70 group-hover:text-primary">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
