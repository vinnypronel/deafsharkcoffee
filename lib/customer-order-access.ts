export type CustomerOrderRecord = {
  id: number;
  orderNumber: string;
  customerName: string;
  itemsJson: string;
  totalCents: number;
  status: string;
  paymentMethod: string;
  pickupEta: string;
  fulfillmentType: string;
  scheduledFor: Date | null;
  createdAt: Date;
};

type LoadOwnedOrder = (
  orderNumber: string,
  customerUserId: string,
) => Promise<CustomerOrderRecord | null>;

const privateHeaders = { "Cache-Control": "private, no-store" };

/**
 * Serves an order only through a loader that is scoped to the authenticated user.
 * The route owns session validation; this helper keeps input and response behavior
 * independently testable without a live Better Auth or D1 instance.
 */
export async function serveOwnedCustomerOrder(
  request: Request,
  customerUserId: string,
  loadOwnedOrder: LoadOwnedOrder,
) {
  let payload: { orderNumber?: unknown };
  try {
    payload = await request.json() as { orderNumber?: unknown };
  } catch {
    return Response.json(
      { error: "Select an order from your account." },
      { status: 400, headers: privateHeaders },
    );
  }

  const orderNumber = typeof payload.orderNumber === "string"
    ? payload.orderNumber.trim().toUpperCase()
    : "";

  if (!orderNumber) {
    return Response.json(
      { error: "Select an order from your account." },
      { status: 400, headers: privateHeaders },
    );
  }

  const order = await loadOwnedOrder(orderNumber, customerUserId);
  if (!order) {
    // Missing orders and orders belonging to someone else deliberately look alike.
    return Response.json(
      { error: "We could not find that order in your account." },
      { status: 404, headers: privateHeaders },
    );
  }

  return Response.json(
    {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        items: JSON.parse(order.itemsJson),
        totalCents: order.totalCents,
        status: order.status,
        paymentMethod: order.paymentMethod,
        pickupEta: order.pickupEta,
        fulfillmentType: order.fulfillmentType,
        scheduledFor: order.scheduledFor,
        createdAt: order.createdAt,
      },
    },
    { headers: privateHeaders },
  );
}
