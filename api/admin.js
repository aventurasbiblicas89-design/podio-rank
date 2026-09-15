import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const chaveAdmin = req.headers['x-admin-key'];
  if (chaveAdmin !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const { acao, categoria, item, diasAtras, receita, produtos, valores } = req.body;

    if (acao === 'limpar') {
      await kv.set(`ranking:${categoria}`, []);
      const todas = (await kv.get('ranking:todas')) || [];
      const filtrado = todas.filter(i => i.categoria !== categoria);
      await kv.set('ranking:todas', filtrado);
      return res.status(200).json({ ok: true });
    }

    if (acao === 'adicionar') {
      const entrada = {
        nome: item.nome,
        link: item.link,
        descricao: item.descricao || '',
        valor: Number(item.valor),
        categoria,
        cliques: Number(item.cliques) || 0,
        pagoEm: Date.now() - (Number(diasAtras) || 0) * 86400000,
      };

      const chave = `ranking:${categoria}`;
      const lista = (await kv.get(chave)) || [];
      lista.push(entrada);
      lista.sort((a, b) => b.valor - a.valor);
      await kv.set(chave, lista);

      const todas = (await kv.get('ranking:todas')) || [];
      todas.push(entrada);
      todas.sort((a, b) => b.valor - a.valor);
      await kv.set('ranking:todas', todas);

      return res.status(200).json({ ok: true, entrada });
    }

    if (acao === 'ajustarStats') {
      const stats = { receita: Number(receita) || 0, produtos: Number(produtos) || 0 };
      await kv.set('stats', stats);
      return res.status(200).json({ ok: true, stats });
    }

    // Ajusta o valor das N primeiras posições de uma categoria (e mantém 'ranking:todas' sincronizado)
    // Body esperado: { acao: 'editarPosicoes', categoria: 'todas', valores: [220, 90, 45] }
    if (acao === 'editarPosicoes') {
      if (!categoria) return res.status(400).json({ error: 'Categoria obrigatória' });
      if (!Array.isArray(valores) || valores.length === 0) {
        return res.status(400).json({ error: 'Envie um array "valores" com os novos preços, do 1º ao Nº lugar' });
      }

      const chaveCategoria = `ranking:${categoria}`;
      const listaCategoria = (await kv.get(chaveCategoria)) || [];
      const ordenada = [...listaCategoria].sort((a, b) => b.valor - a.valor);

      if (ordenada.length < valores.length) {
        return res.status(400).json({
          error: `Só existem ${ordenada.length} entradas em '${categoria}', não dá pra ajustar ${valores.length}.`
        });
      }

      const alterados = [];
      for (let i = 0; i < valores.length; i++) {
        const entrada = ordenada[i];
        alterados.push({
          nome: entrada.nome,
          categoriaOriginal: entrada.categoria,
          pagoEm: entrada.pagoEm,
          valorAntigo: entrada.valor,
          valorNovo: Number(valores[i]),
        });
        entrada.valor = Number(valores[i]);
      }

      ordenada.sort((a, b) => b.valor - a.valor);
      await kv.set(chaveCategoria, ordenada);

      // Se a categoria editada for 'todas', cada item pode pertencer a uma categoria própria diferente —
      // sincroniza o valor lá também.
      if (categoria === 'todas') {
        const categoriasAfetadas = [...new Set(alterados.map(a => a.categoriaOriginal).filter(c => c && c !== 'todas'))];
        for (const cat of categoriasAfetadas) {
          const chaveCat = `ranking:${cat}`;
          const listaCat = (await kv.get(chaveCat)) || [];
          const novaListaCat = listaCat.map(item => {
            const alterado = alterados.find(a => a.pagoEm === item.pagoEm);
            return alterado ? { ...item, valor: alterado.valorNovo } : item;
          });
          novaListaCat.sort((a, b) => b.valor - a.valor);
          await kv.set(chaveCat, novaListaCat);
        }
      } else {
        // Se editou uma categoria específica, sincroniza o valor em 'ranking:todas' também
        const todas = (await kv.get('ranking:todas')) || [];
        const novaTodas = todas.map(item => {
          const alterado = alterados.find(a => a.pagoEm === item.pagoEm);
          return alterado ? { ...item, valor: alterado.valorNovo } : item;
        });
        novaTodas.sort((a, b) => b.valor - a.valor);
        await kv.set('ranking:todas', novaTodas);
      }

      return res.status(200).json({ ok: true, alterados });
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
    }

