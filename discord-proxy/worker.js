// Narasi Garage Recruitment -> Discord
// Deploy this file as a Cloudflare Worker.
// Set DISCORD_WEBHOOK_URL as a SECRET in Worker Settings, never in this source.
const ALLOWED_ORIGIN = 'https://waeduuu.github.io';
const LIMIT_BYTES = 70000;
const USERNAME = 'Narasi Garage Recruitment';

function json(body,status,origin) {
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  if(origin===ALLOWED_ORIGIN) headers['Access-Control-Allow-Origin']=ALLOWED_ORIGIN;
  return new Response(JSON.stringify(body),{status,headers});
}

function plain(v,limit) {
  return String(v??'').trim().slice(0,limit);
}

function parts(value,max) {
  const arr = [];
  for(let i=0;i<value.length;i+=max)arr.push(value.slice(i,i+max));
  return arr.length?arr:['-'];
}

function buildDiscordMessages(data) {
  const isSup=data.role==='SUPERVISOR';
  const color=isSup?0x36D9E8:0xE7B450;
  const heading=isSup?'🛡️ NARASI GARAGE | SUPERVISOR':'🔧 NARASI GARAGE | MEKANIK';
  const now=new Date();
  const wib=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit',year:'numeric',
    hour:'2-digit',minute:'2-digit',hour12:false
  }).format(now);
  const allFields=[];
  for(const item of data.applicant) {
    allFields.push({name:'👤 '+plain(item.question,240),value:plain(item.answer,1024)||'-',inline:true});
  }
  for(let i=0;i<data.answers.length;i++) {
    const item=data.answers[i];
    const name=plain(item.question,210);
    const value=plain(item.answer,1600)||'-';
    const chunks=parts(value,850);
    chunks.forEach((c,k)=>{
      allFields.push({
        name:'📋 '+name+(chunks.length>1?' (Bagian '+(k+1)+'/'+chunks.length+')':''),
        value:c,inline:false
      });
    });
  }
  const batches=[];
  let fields=[],size=heading.length+150;
  for(const f of allFields){
    const fieldSize=f.name.length+f.value.length;
    if(fields.length>0 && (size+fieldSize>5100 || fields.length>=22)){
      batches.push(fields);fields=[];size=heading.length+150;
    }
    fields.push(f);size+=fieldSize;
  }
  if(fields.length)batches.push(fields);
  return batches.map((group,i)=>({
    username:USERNAME,allowed_mentions:{parse:[]},
    embeds:[{
      title:heading+(batches.length>1?' • '+(i+1)+'/'+batches.length:''),
      description:i===0?'**OPEN RECRUITMENT • PERMOHONAN BARU**\nInformasi pendaftar dan jawaban interview.':'**LANJUTAN JAWABAN INTERVIEW**',
      color,fields:group,
      footer:{text:'NARASI GARAGE • '+(isSup?'SUPERVISOR':'MECHANIC')+' APPLICATION • '+wib+' WIB'},
      timestamp:now.toISOString()
    }]
  }));
}

export default {
  async fetch(request,env) {
    const origin=request.headers.get('Origin')||'';
    if(origin!==ALLOWED_ORIGIN)return json({ok:false,error:'Origin not allowed'},403,origin);
    if(request.method==='OPTIONS') {
      return new Response(null,{status:204,headers:{
        'Access-Control-Allow-Origin':ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods':'POST, OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type',
        'Access-Control-Max-Age':'86400','Vary':'Origin'
      }});
    }
    if(request.method!=='POST')return json({ok:false,error:'Method not allowed'},405,origin);
    if(!env.DISCORD_WEBHOOK_URL)return json({ok:false,error:'Webhook backend belum dikonfigurasi'},503,origin);
    if(!/^\s*application\/json\b/i.test(request.headers.get('Content-Type')||''))return json({ok:false,error:'JSON required'},415,origin);
    if(Number(request.headers.get('Content-Length')||0)>LIMIT_BYTES)return json({ok:false,error:'Permohonan terlalu panjang'},413,origin);
    let data;
    try {
      const raw=await request.text();
      if(raw.length>LIMIT_BYTES)return json({ok:false,error:'Permohonan terlalu panjang'},413,origin);
      data=JSON.parse(raw);
    } catch(_){return json({ok:false,error:'Invalid JSON'},400,origin);}
    if(!data||!['SUPERVISOR','PEKERJA'].includes(data.role)||
      !Array.isArray(data.applicant)||!Array.isArray(data.answers))return json({ok:false,error:'Data permohonan tidak valid'},400,origin);
    const expectedAnswers=data.role==='SUPERVISOR'?16:14;
    const expectedProfile=data.role==='SUPERVISOR'?6:3;
    if(data.answers.length!==expectedAnswers||data.applicant.length!==expectedProfile)return json({ok:false,error:'Jumlah jawaban tidak sesuai'},400,origin);
    const validEntry=x=>x&&typeof x.question==='string'&&typeof x.answer==='string'&&x.question.length<=300&&x.answer.length<=1600&&x.question.trim()&&x.answer.trim();
    if(!data.applicant.every(validEntry)||!data.answers.every(validEntry))return json({ok:false,error:'Pertanyaan atau jawaban belum lengkap'},400,origin);
    const messages=buildDiscordMessages(data);
    try{
      for(const msg of messages){
        const separator=env.DISCORD_WEBHOOK_URL.includes('?')?'&':'?';
        const resp=await fetch(env.DISCORD_WEBHOOK_URL+separator+'wait=true',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(msg)
        });
        if(!resp.ok)return json({ok:false,error:'Discord tidak menerima seluruh permohonan. Periksa channel sebelum mencoba lagi.'},502,origin);
      }
    }catch(_){return json({ok:false,error:'Tidak dapat menghubungi Discord. Silakan coba lagi.'},502,origin);}
    return json({ok:true,messages:messages.length},200,origin);
  }
};
