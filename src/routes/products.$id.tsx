import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, type Product, type Review, type Cart } from "@/lib/api";
import { ensureCart, getOrCreateCartId, clearStoredCartId } from "@/lib/cart";
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, Star, ShoppingCart, Zap } from "lucide-react";

export const Route = createFileRoute("/products/$id")({
  loader: async ({ context: { queryClient }, params: { id } }) => {
    queryClient.ensureQueryData({
      queryKey: ["product", id],
      queryFn: () => api<Product>(`/products/${id}/`),
    });
    queryClient.ensureQueryData({
      queryKey: ["reviews", id],
      queryFn: () => api<Review[] | { results: Review[] }>(`/products/${id}/reviews/`),
    });
  },
  component: ProductDetail,
  head: () => ({
    meta: [{ title: "Product — Apex Tyres" }],
  }),
});

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => api<Product>(`/products/${id}/`),
  });

  const reviews = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => api<Review[] | { results: Review[] }>(`/products/${id}/reviews/`),
  });

  const addToCart = useMutation({
    mutationFn: async () => {
      let cartId = await getOrCreateCartId();
      try {
        return await api(`/cart/${cartId}/items/`, {
          method: "POST",
          body: JSON.stringify({ product_id: Number(id), quantity: qty }),
        });
      } catch (err: any) {
        if (err.message && err.message.includes("404")) {
          clearStoredCartId();
          cartId = await getOrCreateCartId();
          return await api(`/cart/${cartId}/items/`, {
            method: "POST",
            body: JSON.stringify({ product_id: Number(id), quantity: qty }),
          });
        }
        throw err;
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["cart"] });
      const previousCart = qc.getQueryData<Cart>(["cart"]);

      if (previousCart && product.data) {
        const existingItem = previousCart.items.find((item) => item.product.id === Number(id));
        let newItems;
        if (existingItem) {
          newItems = previousCart.items.map((item) =>
            item.product.id === Number(id)
              ? {
                  ...item,
                  quantity: item.quantity + qty,
                  total_price: Number(item.product.price) * (item.quantity + qty),
                }
              : item
          );
        } else {
          newItems = [
            ...previousCart.items,
            {
              id: Date.now(),
              quantity: qty,
              product: product.data,
              total_price: Number(product.data.price) * qty,
            } as any,
          ];
        }

        qc.setQueryData<Cart>(["cart"], {
          ...previousCart,
          items: newItems,
          total_price: newItems.reduce(
            (acc, item) => acc + Number(item.product.price) * item.quantity,
            0
          ),
        });
      }
      return { previousCart };
    },
    onSuccess: () => {
      toast.success("Added to cart", {
        action: { label: "View cart", onClick: () => navigate({ to: "/cart" }) },
      });
    },
    onError: (e: Error, _, context) => {
      if (context?.previousCart) {
        qc.setQueryData(["cart"], context.previousCart);
      }
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const [reviewForm, setReviewForm] = useState({ name: "", description: "" });
  const addReview = useMutation({
    mutationFn: () =>
      api(`/products/${id}/reviews/`, {
        method: "POST",
        body: JSON.stringify(reviewForm),
      }),
    onSuccess: () => {
      setReviewForm({ name: "", description: "" });
      qc.invalidateQueries({ queryKey: ["reviews", id] });
      toast.success("Review posted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ---- Loading skeleton ---- */
  if (product.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-square animate-pulse rounded-xl bg-surface" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-surface" />
              ))}
            </div>
          </div>
          <div className="space-y-4 pt-4">
            <div className="h-4 w-24 animate-pulse rounded bg-surface" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-surface" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-surface" />
            <div className="h-32 animate-pulse rounded-xl bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (product.isError || !product.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <p className="text-lg font-semibold">Product not found</p>
        <p className="mt-2 text-sm text-muted-foreground">This product may have been removed or doesn't exist.</p>
        <Link to="/products" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 transition">
          ← Back to shop
        </Link>
      </div>
    );
  }

  const p = product.data;
  const images = p.images ?? [];
  const active = images[imgIdx] ?? images[0];
  const reviewList: Review[] = Array.isArray(reviews.data)
    ? reviews.data
    : reviews.data?.results ?? [];

  const inStock = p.inventory > 0;
  const lowStock = p.inventory > 0 && p.inventory < 10;

  const prevImg = () => setImgIdx((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIdx((i) => (i + 1) % images.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary transition">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-primary transition">Shop</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{p.model_name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* ---- Image Gallery ---- */}
        <div className="space-y-4">
          {/* Main image */}
          <div className="relative group aspect-square overflow-hidden rounded-xl border border-border bg-surface">
            {active ? (
              <img
                key={imgIdx}
                src={active.image}
                alt={p.model_name}
                className="h-full w-full object-cover transition-opacity duration-300"
                fetchPriority="high"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="h-2/3 w-2/3 rounded-full border-[24px] border-foreground/70" />
              </div>
            )}

            {/* Arrow navigation — only if multiple images */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImg}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 opacity-0 group-hover:opacity-100 transition hover:border-primary hover:text-primary"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImg}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 opacity-0 group-hover:opacity-100 transition hover:border-primary hover:text-primary"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === imgIdx ? "w-6 bg-primary" : "w-1.5 bg-foreground/40 hover:bg-foreground/70"
                      }`}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Stock badge */}
            <div className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
              !inStock
                ? "bg-destructive/90 text-white"
                : lowStock
                  ? "bg-yellow-500/90 text-black"
                  : "bg-emerald-500/90 text-white"
            }`}>
              {!inStock ? "Out of stock" : lowStock ? `Only ${p.inventory} left` : "In stock"}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((im, i) => (
                <button
                  key={im.id}
                  onClick={() => setImgIdx(i)}
                  className={`aspect-square overflow-hidden rounded-lg border-2 transition ${
                    i === imgIdx
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/60"
                  }`}
                >
                  <img src={im.image} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---- Product Info ---- */}
        <div className="flex flex-col">
          {/* Brand + Category */}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className="rounded bg-primary/10 px-2 py-1 text-primary">{p.brand}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{p.category}</span>
          </div>

          {/* Name */}
          <h1 className="mt-3 font-display text-4xl uppercase leading-none tracking-wide sm:text-5xl">
            {p.model_name}
          </h1>

          {/* Price */}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-5xl text-primary">₦{p.price}</span>
            <span className="text-sm text-muted-foreground">per tyre</span>
          </div>

          {/* Specs grid */}
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Specifications
            </div>
            <div className="grid grid-cols-3 gap-y-4 gap-x-2">
              <Spec label="Width" value={`${p.width}mm`} />
              <Spec label="Aspect Ratio" value={`${p.aspect_ratio}`} />
              <Spec label="Rim Size" value={`R${p.rim_diameter}`} />
              <Spec label="Load Index" value={`${p.load_index}`} />
              <Spec label="Speed Rating" value={p.speed_rating} />
              <Spec label="Tyre Size" value={`${p.width}/${p.aspect_ratio}R${p.rim_diameter}`} />
            </div>
          </div>

          {/* Description */}
          {p.description && (
            <div className="mt-5 rounded-xl border border-border bg-card p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Description
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            </div>
          )}

          {/* Qty + Add to cart */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-4">
              {/* Qty stepper */}
              <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="p-3 hover:bg-surface hover:text-primary disabled:opacity-40 transition"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-bold text-lg">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(p.inventory, q + 1))}
                  disabled={qty >= p.inventory}
                  className="p-3 hover:bg-surface hover:text-primary disabled:opacity-40 transition"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add to cart */}
              <button
                disabled={!inStock || addToCart.isPending}
                onClick={() => addToCart.mutate()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50 transition"
              >
                <ShoppingCart className="h-4 w-4" />
                {addToCart.isPending ? "Adding…" : !inStock ? "Out of stock" : "Add to cart"}
              </button>
            </div>

            {/* Quick-buy hint */}
            {inStock && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                In-stock orders ship same day
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Reviews ---- */}
      <section className="mt-20 border-t border-border pt-12">
        <h2 className="font-display text-3xl uppercase">
          Customer <span className="text-primary">Reviews</span>
          {reviewList.length > 0 && (
            <span className="ml-3 text-lg font-sans font-normal text-muted-foreground">({reviewList.length})</span>
          )}
        </h2>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_380px]">
          {/* Review list */}
          <div className="space-y-4">
            {reviewList.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Star className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No reviews yet — be the first!</p>
              </div>
            )}
            {reviewList.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <div className="font-semibold">{r.name}</div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>

          {/* Review form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reviewForm.name || !reviewForm.description) return;
              addReview.mutate();
            }}
            className="h-fit rounded-xl border border-border bg-card p-6"
          >
            <div className="mb-4 font-display text-xl uppercase">Leave a Review</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your name
                </label>
                <input
                  value={reviewForm.name}
                  onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Smith"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your review
                </label>
                <textarea
                  value={reviewForm.description}
                  onChange={(e) => setReviewForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="How did these tyres perform?"
                  rows={5}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition resize-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={addReview.isPending || !reviewForm.name || !reviewForm.description}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50 transition"
            >
              {addReview.isPending ? "Posting…" : "Post Review"}
            </button>
          </form>
        </div>
      </section>

      {/* Back link */}
      <div className="mt-12 border-t border-border pt-8">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all tyres
        </Link>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-bold text-sm">{value}</div>
    </div>
  );
}
