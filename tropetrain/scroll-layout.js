export class ScrollLayout {
  constructor(data){
    if(data.id!=='tikkun-245-uxlc-layout'||data.revision!==1)throw Error('Unsupported scroll layout source.');
    this.rows=data.rows;this.byWord=new Map();this.byPiece=new Map();
    for(const row of this.rows)for(const cell of row.cells)for(const fragment of cell)for(const piece of fragment){
      const entry={row,piece};this.byPiece.set(piece.id,entry);
      for(const id of piece.readingIds){if(!this.byWord.has(id))this.byWord.set(id,[]);this.byWord.get(id).push(entry);}
    }
  }
  locations(word){return this.byWord.get(word.sourceWordId??word.id)??[];}
  excerpt(words){
    const sections=[];let section=null;
    for(const word of words){
      if(!this.locations(word).length)throw Error(`Scroll layout unavailable for ${word.sourceWordId??word.id}.`);
      if(!section||section.id!==word.sectionId){section={id:word.sectionId,words:[]};sections.push(section);}
      section.words.push(word);
    }
    const output=[];
    for(const section of sections){
      const actual=new Map(section.words.map(word=>[word.sourceWordId??word.id,word]));
      const wanted=new Set(section.words.flatMap(word=>this.locations(word).map(entry=>entry.piece.id)));
      for(const row of this.rows){
        if(!row.cells.some(cell=>cell.some(fragment=>fragment.some(piece=>wanted.has(piece.id)))))continue;
        const cells=row.cells.map(cell=>cell.map(fragment=>fragment.filter(piece=>wanted.has(piece.id)).map(piece=>{
          const selected=piece.readingIds.map(id=>actual.get(id)).filter(Boolean);
          if(selected.length!==piece.readingIds.length)throw Error('A written unit has an incomplete reading-word mapping.');
          return {...piece,words:selected};
        })));
        const all=row.cells.flat(2),shown=cells.flat(2);
        output.push({page:row.page,line:row.line,petucha:row.petucha,cells,sectionId:section.id,
          partial:shown.length!==all.length,differences:shown.filter(piece=>piece.status!=='exact').length});
      }
    }
    return output;
  }
}

let promise;
export function getScrollLayout(){
  return promise??=import('./scroll-layout-data.js').then(async({encoded})=>{
    if(typeof DecompressionStream==='undefined')throw Error('Sourced scroll lines need a current browser with gzip support.');
    const bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
    const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    return new ScrollLayout(JSON.parse(text));
  });
}
