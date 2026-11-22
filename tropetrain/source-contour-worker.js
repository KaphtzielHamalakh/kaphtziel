// Original software CC0-1.0; generated source-measurement adaptations CC BY-SA3.0.
import {renderSourceContour} from './source-contour.js';
self.onmessage=event=>{
 try{
  let reported=-1;
  const result=renderSourceContour(event.data.data,event.data.semitones,{onProgress:value=>{const percent=Math.floor(value*100);if(percent!==reported){reported=percent;self.postMessage({type:'progress',value});}}});
  self.postMessage({type:'result',...result},[result.buffer]);
 }catch(error){self.postMessage({type:'error',message:error.message});}
};
