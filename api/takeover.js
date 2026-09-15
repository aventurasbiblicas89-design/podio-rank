import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const takeover = await kv.get('takeover:ativo');
    if (!takeover || takeover.expiraEm < Date.now()) {
      return res.status(200).json({ ativo: false });
    }
    const segundosRestantes = Math.max(0, Math.floor((takeover.expiraEm - Date.now()) / 1000));
    return res.status(200).json({
      ativo: true,
      nome: takeover.nome,
      link: takeover.link,
      descricao: takeover.descricao,
      categoria: takeover.categoria,
      segundosRestantes,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ativo: false, error: err.message });
  }
}
