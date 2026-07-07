// src/routes/products.tsx
// This is the layout shell for /products/* routes.
// The actual product list lives in products.index.tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/products")({
  component: () => <Outlet />,
});
