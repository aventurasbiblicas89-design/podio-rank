import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const { tipo = 'total', categoria = 'todas' } = req.query;

    if (tipo === 'total') {
      // Histórico do total arrecadado no site inteiro, ao longo do tempo
      const todas = (await kv.get('ranking:todas')) || [];
      const ordenadas = [...todas].sort((a, b) => a.pagoEm - b.pagoEm);

      let acumulado = 0;
      const pontos = ordenadas.map(i => {
        acumulado += Number(i.valor);
        return { timestamp: i.pagoEm, valor: Number(acumulado.toFixed(2)) };
      });

      return res.status(200).json({ tipo: 'total', pontos });
    }

    if (tipo === 'recorde') {
      // Histórico de preço do #1 de uma categoria: cada vez que um novo lance
      // supera o maior valor pago até então naquela categoria, isso é um "novo recorde"
      const chave = `ranking:${categoria}`;
      const itens = (await kv.get(chave)) || [];
      const ordenados = [...itens].sort((a, b) => a.pagoEm - b.pagoEm);

      let maiorAteAgora = 0;
      const pontos = [];
      for (const i of ordenados) {
        const valor = Number(i.valor);
        if (valor > maiorAteAgora) {
          maiorAteAgora = valor;
          pontos.push({ timestamp: i.pagoEm, valor, nome: i.nome });
        }
      }

      return res.status(200).json({ tipo: 'recorde', categoria, pontos });
    }

    return res.status(400).json({ erro: 'tipo inválido (use total ou recorde)' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ pontos: [] });
  }
}
