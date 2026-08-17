import type { Metadata } from "next";
import { Storefront } from "../storefront";

export const metadata: Metadata = {
  title: "Order Pickup | Deaf Shark Coffee",
  description: "Browse the Deaf Shark Coffee menu, customize your favorites, and order ahead for pickup in Union, New Jersey.",
};

export default function MenuPage() {
  return <Storefront page="menu" />;
}
