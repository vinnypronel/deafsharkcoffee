import type { Metadata } from "next";
import { OrdersPage } from "./orders-page";

export const metadata: Metadata = {
  title: "My Orders | Deaf Shark Coffee",
  description: "View the live status of your Deaf Shark Coffee pickup orders.",
};

export default function Page() {
  return <OrdersPage />;
}
