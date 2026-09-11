export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405 });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado no Netlify" }),
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { index, name, url, price, siteUrl } = body;

    if (index === undefined || !name || !price) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400 });
    }

    const origin = new URL(siteUrl).origin;
    const externalReference = JSON.stringify({ index, name, url: url || "" });

    const preference = {
      items: [
        {
          title: `Pódio — Posição #${index + 1}: ${name}`,
          quantity: 1,
          unit_price: Number(price),
          currency_id: "BRL",
        },
      ],
      back_urls: {
        success: siteUrl || "/",
        failure: siteUrl || "/",
        pending: siteUrl || "/",
      },
      auto_return: "approved",
      external_reference: externalReference,
      notification_url: `${origin}/.netlify/functions/mp-webhook`,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return new Response(JSON.stringify({ error: "Erro no Mercado Pago", details: data }), {
        status: 502,
      });
    }

    return new Response(JSON.stringify({ init_point: data.init_point }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
    });
  }
};

export const config = {
  path: "/.netlify/functions/create-preference",
};
