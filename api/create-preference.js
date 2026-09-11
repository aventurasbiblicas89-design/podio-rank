import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), { status: 405 });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado" }), { status: 500 });
  }

  try {
    const body = await req.json();
    const { index, name, url, price, siteUrl, title } = body;

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [{
          id: String(index || "1"),
          title: title || name || "PódioRank TOP 10",
          quantity: 1,
          unit_price: Number(price) || 29.90,
          currency_id: "BRL"
        }],
        metadata: { buyer_name: name, buyer_url: url, site: siteUrl },
        back_urls: {
          success: "https://podiorank.com.br/sucesso.html",
          failure: "https://podiorank.com.br/erro.html",
          pending: "https://podiorank.com.br/pendente.html"
        },
        auto_return: "approved"
      }
    });

    return new Response(JSON.stringify({ init_point: result.init_point }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
