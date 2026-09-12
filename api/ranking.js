export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET');
  
  // PREÇOS NOVOS: #10 = R$30 até #1 = R$318
  const precos = {10:30.00,9:39.00,8:50.70,7:65.91,6:85.68,5:111.39,4:144.80,3:188.24,2:244.72,1:318.14};
  
  let ranking = {};
  for(let i=1;i<=10;i++){
    ranking[i] = {preco: precos[i], nome: "LIVRE", url: "https://podiorank.com.br"};
  }

  // Tenta pegar do banco, mas IGNORA se tiver undefined
  try{
    if(process.env.KV_REST_API_URL){
      const r=await fetch(`${process.env.KV_REST_API_URL}/get/ranking`,{
        headers:{Authorization:`Bearer ${process.env.KV_REST_API_TOKEN}`}
      });
      const j=await r.json();
      if(j.result){
        const saved = JSON.parse(j.result);
        for(let k=1;k<=10;k++){
          if(saved[k] && saved[k].nome && saved[k].nome !== "undefined" && saved[k].nome !== "UNDEFINED"){
            ranking[k]=saved[k];
          }
        }
      }
    }
  }catch(e){}

  return res.status(200).json(ranking);
}
