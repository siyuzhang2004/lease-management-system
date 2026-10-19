/* Group digits for display; leave model values and calculation precision intact. */
function ungroupNumber(value){return String(value).replace(/[,，\s]/g,'');}
function groupNumber(value){
 const raw=ungroupNumber(value);
 if(!/^-?\d+(\.\d+)?$/.test(raw))return raw;
 const [whole,fraction]=raw.split('.');
 return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+(fraction||'').padEnd(2,'0');
}
function prepareNumberDisplay(root=document){
 root.querySelectorAll('input[type=number],input[data-number-display]').forEach(input=>{
  const key=input.dataset.calc||input.dataset.financial||input.dataset.lease||input.dataset.phaseField||input.dataset.calendarTerm||input.dataset.stageField||input.dataset.repeatField||'';
  const count=/months|frequency|period|every|discount|rate|ratio/i.test(key);
  const amount=/gross/i.test(key)||input.hasAttribute('data-schedule-rent')||input.hasAttribute('data-schedule-group')||(!count&&!input.hasAttribute('data-schedule-payment'));
  input.classList.add('numeric-centered');
  if(!amount)return;
  input.dataset.numberDisplay='true';input.type='text';input.inputMode='decimal';
  if(input!==document.activeElement)input.value=groupNumber(input.value);
 });
}
document.addEventListener('focusin',e=>{if(e.target.matches('input[data-number-display]'))e.target.value=ungroupNumber(e.target.value);},true);
document.addEventListener('input',e=>{
 const input=e.target;if(!input.matches('input[data-number-display]'))return;
 const caret=input.selectionStart,old=input.value,raw=ungroupNumber(old);
 if(raw!==old){input.value=raw;if(caret!==null){const next=ungroupNumber(old.slice(0,caret)).length;input.setSelectionRange(next,next);}}
},true);
document.addEventListener('focusout',e=>{if(e.target.matches('input[data-number-display]'))e.target.value=groupNumber(e.target.value);},true);
new MutationObserver(()=>prepareNumberDisplay()).observe(document.body,{childList:true,subtree:true});
prepareNumberDisplay();
