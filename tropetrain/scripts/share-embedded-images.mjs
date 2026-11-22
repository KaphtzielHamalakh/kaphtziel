// Keep each original image in its img.src; links reuse those exact embedded bytes.
export function shareEmbeddedImages(html){
 const images=new Map();
 for(const tag of html.matchAll(/<img\b[^>]*>/g)){
  const id=tag[0].match(/\bid="([A-Za-z][\w-]*)"/),src=tag[0].match(/\bsrc="(data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+)"/);
  if(id&&src&&!images.has(src[1]))images.set(src[1],id[1]);
 }
 let count=0;
 const output=html.replace(/href="(data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+)"/g,(original,url)=>{
  const id=images.get(url);if(!id)return original;count++;return `href="#${id}" data-embedded-image="${id}"`;
 });
 if(!count)return {html,count,savedBytes:0};
 const marker='<script id="source-pitch-packets"';
 if(!output.includes(marker))throw Error('The portable image links must initialize before the app.');
 const init=`<script id="standalone-image-links">for(const link of document.querySelectorAll('a[data-embedded-image]')){const image=document.getElementById(link.dataset.embeddedImage);if(image?.src.startsWith('data:image/'))link.href=image.src;}</script>`;
 const shared=output.replace(marker,init+marker);
 return {html:shared,count,savedBytes:Buffer.byteLength(html)-Buffer.byteLength(shared)};
}
