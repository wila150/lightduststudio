// 從本機資料夾批次匯入平面作品到 PHOTOGRAPH 頁＋媒體庫，並把合作品牌 LOGO 加進首頁跑馬燈
// 用法（在專案根目錄執行）：node scripts/import-photo-folders.js [run] [平面資料夾路徑] [LOGO資料夾路徑]
//   不帶 run = 只印規劃不上傳。可重複執行：分類/相簿/作品用名稱比對，已上傳過的檔名不會重複上傳
//   注意：LOGO 部分只比對媒體庫檔名，沒有新 LOGO 時不會重複加進跑馬燈；LOGO 資料夾路徑帶 "-" 就跳過 LOGO 不處理
require(process.cwd()+"/node_modules/dotenv").config({path: process.cwd()+"/.env",quiet:true});
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const {tenantCollection}=require(process.cwd()+"/config/firebase");
const storageService=require(process.cwd()+"/services/storageService");
const RUN=process.argv[2]==="run", T="default", PAGE="ox87mWDphrW2aGYDUCmR";
const SRC=process.argv[3]||"/Users/josephwu/Desktop/藍點網站架設作品集-20260928T092908Z-1-006/藍點網站架設作品集/平面";
const LOGO_DIR=process.argv[4]||"/Users/josephwu/Desktop/合作品牌logo-20260928T093116Z-1-001/合作品牌logo";
const CATS=[["人像拍攝","Portrait Photography","portrait"],["主視覺影像製作","Key Visual Production","key-visual"],["形象照/演員卡","Headshots & Model Cards","headshot"],["活動紀錄","Event Photography","event"],["美食攝影","Food Photography","food"],["婚慶/抓周/性別派對","Weddings & Celebrations","celebration"],["運動攝影","Sports Photography","sports"],["劇場/舞台攝影","Theatre & Stage Photography","stage"]];
const FOLDER_TO_CAT={"人像拍攝":"人像拍攝","形象照_演員卡":"形象照/演員卡","活動紀錄":"活動紀錄","主視覺影像製作":"主視覺影像製作","主視覺影像製作 Key Visual Production":"主視覺影像製作","食物攝影":"美食攝影","運動攝影":"運動攝影","婚慶_抓周_性別派對":"婚慶/抓周/性別派對","劇場_舞台攝影":"劇場/舞台攝影"};
const RECLASS=[[/演出|劇照|SHOWCASE/,"劇場/舞台攝影"],[/性別揭曉|抓周|婚禮|婚紗/,"婚慶/抓周/性別派對"]];
const EXCLUDE_LOGOS=[/藍點影像工作室/];
const IMG=/\.(jpe?g|png|webp|gif)$/i;
const mime=f=>/\.png$/i.test(f)?"image/png":/\.gif$/i.test(f)?"image/gif":/\.webp$/i.test(f)?"image/webp":"image/jpeg";
const hash=f=>crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
const clean=s=>s.trim().replace(/\s+/g," ");
const byName=(a,b)=>a.localeCompare(b,"zh-Hant",{numeric:true});

async function findOrCreate(col,match,data){const snap=await tenantCollection(T,col).get();const hit=snap.docs.find(d=>match(d.data()));if(hit)return {id:hit.id,...hit.data(),_existing:true};if(!RUN)return {id:"(new)",...data};const ref=await tenantCollection(T,col).add(data);return {id:ref.id,...data};}
async function upload(file,albumId,alt){const buf=fs.readFileSync(file);const name=path.basename(file);const {url,path:p}=await storageService.uploadBuffer(buf,name,mime(name),"media",{trim:!!alt&&alt.startsWith("logo:")});
 const doc={name,url,path:p,size:buf.length,contentType:mime(name),albumId,alt:alt.replace(/^logo:/,""),createdAt:new Date()};await tenantCollection(T,"media").add(doc);return doc;}
async function pool(tasks,n){const out=[];let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<tasks.length){const k=i++;out[k]=await tasks[k]();}}));return out;}

(async()=>{
 const now=Date.now(); const catIds={}, albumIds={};
 for(const [i,[label,nameEn]] of CATS.entries()){
  const c=await findOrCreate("pageCategories",d=>d.pageId===PAGE&&d.label===label,{pageId:PAGE,label,nameEn,sortOrder:(CATS.length-i)*10,parentCategoryId:"",createdAt:new Date(),updatedAt:new Date()});catIds[label]=c.id;
  const a=await findOrCreate("mediaAlbums",d=>d.label===label&&!d.parentAlbumId,{label,parentAlbumId:"",createdAt:new Date(now+i)});albumIds[label]=a.id;
 }
 // 收集作品
 const works=[];
 for(const top of fs.readdirSync(SRC).filter(f=>fs.statSync(path.join(SRC,f)).isDirectory()).sort(byName)){
  const baseCat=FOLDER_TO_CAT[top]; if(!baseCat){console.log("?? 未知分類資料夾",top);continue;}
  for(const sub of fs.readdirSync(path.join(SRC,top)).filter(f=>fs.statSync(path.join(SRC,top,f)).isDirectory()).sort(byName)){
   const title=clean(sub); const cat=(RECLASS.find(([re])=>baseCat==="活動紀錄"&&re.test(title))||[])[1]||baseCat;
   const dir=path.join(SRC,top,sub); const files=fs.readdirSync(dir).filter(f=>IMG.test(f)&&!f.startsWith(".")).sort(byName);
   const cover=files.find(f=>/^封面\./.test(f)); let photos=files.filter(f=>f!==cover);
   // 封面如果跟某張內頁照片是同一個檔案，就不要重複放進相簿
   const coverDup=cover&&photos.some(f=>hash(path.join(dir,f))===hash(path.join(dir,cover)));
   works.push({title,cat,dir,cover,coverDup,photos});
  }
 }
 const plan={};works.forEach(w=>{(plan[w.cat]=plan[w.cat]||[]).push(`${w.title} (${w.photos.length + (w.cover&&!w.coverDup?1:0)}張${w.cover?"，有封面":""})`)});
 for(const [l] of CATS) console.log(`\n【${l}】`,(plan[l]||["（這包沒有作品）"]).join("\n   "));
 const SKIP_LOGOS=LOGO_DIR==="-";
 const logos=SKIP_LOGOS?[]:fs.readdirSync(LOGO_DIR).filter(f=>IMG.test(f)&&!EXCLUDE_LOGOS.some(r=>r.test(f))).sort(byName);
 console.log(`\n【合作品牌LOGO】${logos.length} 個`);
 if(!RUN){process.exit(0);}

 // 作品：同分類內照資料夾名稱排序，全站排序 = 分類順序在前
 const existingItems=(await tenantCollection(T,"pageItems").get()).docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.pageId===PAGE);
 const catRank=Object.fromEntries(CATS.map(([l],i)=>[l,CATS.length-i]));
 const counters={};
 for(const w of works){
  counters[w.cat]=(counters[w.cat]||0)+1;
  const album=await findOrCreate("mediaAlbums",d=>d.label===w.title&&d.parentAlbumId===albumIds[w.cat],{label:w.title,parentAlbumId:albumIds[w.cat],createdAt:new Date()});
  const item=existingItems.find(d=>d.title===w.title);
  const have=new Set(((item&&item.images)||[]).map(im=>im.sourceName));
  const list=[...(w.cover&&!w.coverDup?[w.cover]:[]),...w.photos].filter(f=>!have.has(f));
  const uploaded=await pool(list.map(f=>()=>upload(path.join(w.dir,f),album.id,w.title).then(doc=>({f,doc}))),4);
  const newImages=uploaded.map(({f,doc})=>({id:crypto.randomUUID(),type:"image",url:doc.url,path:"",alt:w.title,sourceName:f}));
  const coverUp=uploaded.find(u=>u.f===w.cover);
  let coverImage=(item&&item.coverImage)||null;
  if(coverUp) coverImage={url:coverUp.doc.url,type:"image",alt:w.title};
  else if(w.cover&&w.coverDup&&!coverImage){const twin=w.photos.find(f=>hash(path.join(w.dir,f))===hash(path.join(w.dir,w.cover)));const u=uploaded.find(x=>x.f===twin);if(u)coverImage={url:u.doc.url,type:"image",alt:w.title};}
  if(!coverImage&&uploaded[0]) coverImage={url:uploaded[0].doc.url,type:"image",alt:w.title};
  if(item){
   await tenantCollection(T,"pageItems").doc(item.id).update({images:[...(item.images||[]),...newImages],coverImage,category:catIds[w.cat],updatedAt:new Date()});
   console.log("更新",w.title,"+",newImages.length);
  }else{
   const catKey=CATS.find(([l])=>l===w.cat)[2];
   await tenantCollection(T,"pageItems").add({pageId:PAGE,slug:`${catKey}-${String(counters[w.cat]).padStart(2,"0")}-${crypto.randomBytes(2).toString("hex")}`,title:w.title,description:"",metaDescription:"",author:"",link:"",category:catIds[w.cat],published:true,publishAt:null,galleryLayout:"masonry",images:newImages,coverImage,modules:[],sortOrder:catRank[w.cat]*1000-counters[w.cat],createdAt:new Date(),updatedAt:new Date()});
   console.log("新增",w.cat,"/",w.title,newImages.length);
  }
 }
 // LOGO：放進媒體庫相簿，並設成首頁贊助商跑馬燈
 if(SKIP_LOGOS){process.exit(0);}
 const logoAlbum=await findOrCreate("mediaAlbums",d=>d.label==="合作品牌LOGO",{label:"合作品牌LOGO",parentAlbumId:"",createdAt:new Date(now+100)});
 const existingLogos=new Set((await tenantCollection(T,"media").get()).docs.map(d=>d.data()).filter(d=>d.albumId===logoAlbum.id).map(d=>d.name));
 const upLogos=await pool(logos.filter(f=>!existingLogos.has(f)).map(f=>()=>upload(path.join(LOGO_DIR,f),logoAlbum.id,"logo:"+f.replace(/\.[^.]+$/,""))),4);
 const homeRef=tenantCollection(T,"pages").doc("home");const home=(await homeRef.get()).data();
 const modules=home.modules.map(m=>m.type==="sponsorMarquee"?{...m,data:{...m.data,logos:[...(m.data.logos||[]),...upLogos.map(d=>({id:crypto.randomUUID().slice(0,10),url:d.url,path:""}))]}}:m);
 await homeRef.update({modules});
 console.log("LOGO 上傳",upLogos.length);
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
