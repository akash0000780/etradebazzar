import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
  Row,
  Column,
} from "@react-email/components";

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface OrderPlacedProps {
  customerName: string;
  orderId: string;
  orderType: string;
  items: OrderItem[];
  totalAmount: number;
  orderUrl: string;
}

export function OrderPlacedEmail({
  customerName,
  orderId,
  orderType,
  items,
  totalAmount,
  orderUrl,
}: OrderPlacedProps) {
  return (
    <Html>
      <Head />
      <Preview>Order #{orderId} placed successfully</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb" }}>
        <Container
          style={{
            maxWidth: 600,
            margin: "40px auto",
            background: "#fff",
            borderRadius: 8,
            padding: 32,
          }}
        >
          <Heading style={{ color: "#1d4ed8" }}>Order Placed 🛒</Heading>
          <Text>Hi {customerName},</Text>
          <Text>
            Your order <strong>#{orderId}</strong> ({orderType}) has been placed
            successfully.
          </Text>

          {items.map((item, i) => (
            <Row
              key={i}
              style={{ borderBottom: "1px solid #e5e7eb", padding: "8px 0" }}
            >
              <Column>
                {item.name} × {item.quantity}
              </Column>
              <Column style={{ textAlign: "right" }}>
                ₹{(item.unitPrice * item.quantity).toFixed(2)}
              </Column>
            </Row>
          ))}

          <Text style={{ textAlign: "right", fontWeight: "bold" }}>
            Total: ₹{totalAmount.toFixed(2)}
          </Text>

          <Button
            href={orderUrl}
            style={{
              background: "#1d4ed8",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            Track Order
          </Button>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>ETradeBazaar</Text>
        </Container>
      </Body>
    </Html>
  );
}
