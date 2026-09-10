import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("type") || url.searchParams.get("topic");
    const paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");

    if (topic !== "payment" || !paymentId) {
      return new Response("ok", { status: 200 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await paymentRes.json();

    if (payment.status === "approved" && payment.external_reference) {
      const ref = JSON.parse(payment.external_reference);
      const store = getStore("podio-board");
      let data = await store.get("state", { type: "json" });

      if (data && data.entries[ref.index]) {
        const entry = data.entries[ref.index];
        data.entries[ref.index] = {
          name: ref.name,
          desc: ref.url || "Sem descrição",
          holder: true,
          basePrice: entry.basePrice,
          price: Math.round(entry.price * 1.3), // sobe 30% sobre o valor pago
          discountActive: false, // uma vez reivindicada, o preço já é o "de mercado"
        };
        await store.setJSON("state", data);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response("error: " + String(err), { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/mp-webhook",
};
