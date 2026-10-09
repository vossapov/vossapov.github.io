/** Local-only CLIP photo retrieval for static hosting. No image leaves the browser. */
const base = new URL('.', import.meta.url);
let indexPromise, runtimePromise, sessionPromise;
const asset = path => new URL(path, base).href;
async function index() {
  if (!indexPromise) indexPromise = fetch(asset('photo-index.json')).then(r => {
    if (!r.ok) throw new Error('Не вдалося завантажити фотокаталог.');
    return r.json();
  }).catch(error => { indexPromise = null; throw error; });
  return indexPromise;
}
async function runtime() {
  if (!runtimePromise) runtimePromise = import(asset('vendor/ort.wasm.min.mjs')).then(ort => {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = asset('vendor/');
    ort.env.logLevel = 'error';
    return ort;
  }).catch(error => { runtimePromise = null; throw error; });
  return runtimePromise;
}
async function session(onProgress) {
  if (!sessionPromise) sessionPromise = (async () => {
    onProgress('Завантажуємо локальну модель пошуку за фото (89 МБ). Перший запуск може тривати довше.');
    const ort = await runtime();
    return ort.InferenceSession.create(asset('models/clip-vision.onnx'), {
      executionProviders: ['wasm'], graphOptimizationLevel: 'all',
    });
  })().catch(error => { sessionPromise = null; throw error; });
  return sessionPromise;
}
async function decode(file) {
  let img;
  if (typeof createImageBitmap === 'function') {
    img = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } else {
    const url = URL.createObjectURL(file);
    try {
      img = await new Promise((resolve,reject) => {
        const image = new Image(); image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Не вдалося прочитати фото. Спробуйте JPEG або PNG.'));
        image.src = url;
      });
    } finally { URL.revokeObjectURL(url); }
  }
  const width = img.naturalWidth || img.width, height = img.naturalHeight || img.height;
  if (Math.min(width,height) < 32 || width * height > 24000000) {
    img.close?.();
    throw new Error('Фото має бути від 32 × 32 пікселів і не більше 24 мегапікселів.');
  }
  return { img, width, height };
}
function pixels({img,width,height}) {
  const canvas = document.createElement('canvas');canvas.width=224;canvas.height=224;
  const context = canvas.getContext('2d', { willReadFrequently:true });
  if (!context) throw new Error('Браузер не підтримує обробку фото.');
  context.fillStyle='#fff';context.fillRect(0,0,224,224);
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  const side=Math.min(width,height);
  context.drawImage(img,(width-side)/2,(height-side)/2,side,side,0,0,224,224);
  const raw=context.getImageData(0,0,224,224).data, output=new Float32Array(3*224*224);
  const mean=[.48145466,.4578275,.40821073], std=[.26862954,.26130258,.27577711];
  for(let i=0;i<224*224;i++) for(let c=0;c<3;c++) output[c*224*224+i]=(raw[i*4+c]/255-mean[c])/std[c];
  return output;
}
/** @param {File|Blob} file @param {(message:string)=>void} onProgress */
export async function findPhoto(file,onProgress=()=>{}) {
  if (!(file instanceof Blob) || !file.size) throw new Error('Виберіть фотографію товару.');
  if(file.size>12*1024*1024) throw new Error('Фото має бути менше 12 МБ.');
  if(file.type && !file.type.startsWith('image/')) throw new Error('Виберіть зображення JPEG, PNG або WebP.');
  onProgress('Перевіряємо фото на цьому пристрої…');
  const db=await index();
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  const known=db.hashes.indexOf(hash);
  if(known>=0) return { products:[db.products[known]],exact:true,message:'Точний збіг із фото демокаталогу.' };
  let decoded;
  try { decoded=await decode(file); }
  catch(error) { throw new Error(error.message || 'Не вдалося прочитати фото. Спробуйте JPEG або PNG.'); }
  let input;
  try { input=pixels(decoded); } finally { decoded.img.close?.(); }
  const model=await session(onProgress), ort=await runtime();
  onProgress('Порівнюємо фото з 30 товарами на вашому пристрої…');
  const tensor=new ort.Tensor('float32',input,[1,3,224,224]);
  let result;
  try { result=await model.run({pixel_values:tensor}); } finally { tensor.dispose?.(); }
  const output=result.image_embeds;
  const v=Array.from(output.data);Object.values(result).forEach(t=>t.dispose?.());
  const norm=Math.sqrt(v.reduce((sum,n)=>sum+n*n,0));
  if(!Number.isFinite(norm)||norm===0) throw new Error('Не вдалося порівняти фото. Спробуйте інший знімок.');
  const unit=v.map(n=>n/norm);
  const ranked=db.vectors.map((vector,i)=>({product:db.products[i],score:vector.reduce((sum,n,k)=>sum+n*unit[k],0)})).sort((a,b)=>b.score-a.score);
  if(!ranked.length||ranked[0].score<.58) return {products:[],exact:false,message:'Надійного збігу немає. Спробуйте фото одного товару на простому фоні або введіть артикул.'};
  return { products:ranked.slice(0,5).filter(x=>x.score>=Math.max(.58,ranked[0].score-.13)).map(x=>x.product),exact:false,message:'Схожі товари. Звірте модель, розмір і артикул: фото не підтверджує точний SKU.' };
}
