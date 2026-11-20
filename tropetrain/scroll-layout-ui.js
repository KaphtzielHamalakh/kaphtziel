// The layout carries written letters and reading-word identities separately.
// It never supplies notes, syllables, phonemes, or a replacement Bible text.
export const linkedWordIds=element=>(element.dataset.linkedWords??element.dataset.word??'').split(' ').filter(Boolean);
export const marksWord=(element,id)=>id!==null&&linkedWordIds(element).includes(id);
export const writtenUnitClass=words=>words.length>1?'multiple':words[0].signAnalysis.className??'';

export function scrollPane(rows,{makeButton}){
  const pane=document.createElement('div');pane.className='scroll-lines-pane';
  pane.setAttribute('role','region');pane.setAttribute('aria-label','Sourced scroll line excerpts');pane.tabIndex=0;
  for(const row of rows){
    const block=document.createElement('div');block.className='scroll-source-row';block.dataset.layoutPage=row.page;block.dataset.layoutLine=row.line;block.dataset.section=row.sectionId;
    const label=document.createElement('div');label.className='scroll-row-label';
    label.textContent=`Column ${row.page} · line ${row.line}${row.partial?' · excerpt':''}${row.differences?' · edition difference':''}`;block.append(label);
    const cells=document.createElement('div');cells.className='scroll-source-cells';cells.dir='rtl';
    for(const cell of row.cells){
      const column=document.createElement('div');column.className=`scroll-source-cell${row.petucha?' source-petucha':''}`;
      for(const fragment of cell){
        const group=document.createElement('span');group.className='scroll-source-fragment';
        for(const piece of fragment){
          const button=makeButton(piece);button.classList.add('scroll-word');button.dataset.layoutStatus=piece.status;button.dataset.writtenIds=piece.writtenIds.join(' ');
          button.title+=` · Layout column ${row.page}, line ${row.line}${piece.variant?' · Written variant; reading words are kept separately.':''}${piece.status!=='exact'?` · ${piece.status}: layout source ${piece.layoutSource}; UXLC written letters ${piece.written}.`:''}`;
          group.append(button,document.createTextNode(' '));
        }
        column.append(group);
      }
      cells.append(column);
    }
    block.append(cells);pane.append(block);
  }
  return pane;
}
