export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  const base = [0,318.14,244.72,188.24,144.80,111.39,85.68,65.91,50.70,39.00,30.00];
  let ranking = {};
  for(let i=1;i<=10;i++){
    ranking[i]={preco:base[i],nome:"LIVRE",url:"https://podiorank.com.br",pago:0};
  }
  try{
    if(process.env.KV_REST_API_URL){
      const r=await fetch(`${process.env.KV_REST_API_URL}/get/ranking`,{
        headers:{Authorization:`Bearer ${process.env.KV_REST_API_TOKEN}`}
      });
      const j=await r.json();
      if(j.result){
        const saved=JSON.parse(j.result);
        for(let k=1;k<=10;k++) if(saved[k] && saved[k].preco) ranking[k]=saved[k];
      }
    }
  }catch(e){}
  return res.status(200).json(ranking);
}
