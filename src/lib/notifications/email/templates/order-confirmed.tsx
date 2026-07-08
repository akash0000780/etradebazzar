import { Html,Body, Head, Preview, Container, Heading, Text, Button, Hr, } from "@react-email/components";
interface OrderConfirmedProps {
  customerName: string;
  orderId: string;
  finalAmount: number;
  orderUrl: string;
}

export function OrderConfirmedEmail({
  customerName,
  orderId,
  finalAmount,
  orderUrl,
}: OrderConfirmedProps) {
  return (
    <Html>
      <Head />
      <Preview>Order #{orderId} confirmed</Preview>
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
          <Heading style={{ color: "#16a34a" }}>Order Confirmed ✓</Heading>
          <Text>Hi {customerName},</Text>
          <Text>
            Your order <strong>#{orderId}</strong> has been confirmed. Final
            amount: <strong>₹{finalAmount.toFixed(2)}</strong>
          </Text>
          <Button
            href={orderUrl}
            style={{
              background: "#16a34a",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            View Order
          </Button>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>ETradeBazaar</Text>
        </Container>
      </Body>
    </Html>
  );
}
