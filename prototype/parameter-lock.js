/* Per-contract editing lock, persisted independently from calculation inputs. */
function parametersAreLocked(){return activeLease()?.parametersLocked!==false;}
function applyParameterLock(){
 const view=document.querySelector('#calculationView');if(!view||!activeLease())return;
 const locked=parametersAreLocked();view.dataset.parametersLocked=String(locked);
 view.querySelectorAll('.calc-params input,.calc-params select,.calc-params textarea,.calc-rent input,.calc-rent select,.calc-rent textarea,#contractAdvancedBody input,#contractAdvancedBody select,#contractAdvancedBody textarea,#calcAddStage,[data-phase-remove],#caAddFree,[data-advanced-free-remove],#calcGenerate').forEach(el=>{
  if(locked){if(!el.disabled)el.dataset.disabledByParameterLock='true';el.disabled=true;}
  else if(el.dataset.disabledByParameterLock){el.disabled=false;delete el.dataset.disabledByParameterLock;}
 });
}
function renderParameterLock(){
 const view=document.querySelector('#calculationView'),record=activeLease();if(!view||!record)return;
 if(record.parametersLocked===undefined){record.parametersLocked=true;persistContracts();}
 let bar=document.querySelector('#parameterLockBar');if(!bar){bar=document.createElement('section');bar.id='parameterLockBar';bar.className='parameter-lock-bar';view.querySelector('.calc-params').before(bar);}
 bar.hidden=leaseRoute!=='parameters';const locked=parametersAreLocked();
 bar.innerHTML=`<div><strong>${locked?'参数已锁定':'参数编辑中'}</strong><span>${locked?'当前为查看模式，解锁后才可修改合同参数。':'修改后自动生成计算表；完成后请锁定参数，避免误改。'}</span></div><button type="button" class="${locked?'ghost':'primary'}" id="toggleParameterLock">${locked?'解锁参数':'锁定参数'}</button>`;
 document.querySelector('#toggleParameterLock').onclick=()=>{record.parametersLocked=!parametersAreLocked();persistContracts();renderParameterLock();};
 applyParameterLock();
}
for(const name of ['renderCalcParams','renderRentPhases','renderContractAdvanced']){
 // Each renderer can recreate controls after switching contracts or expanding
 // a rent group. Reapply the lock to the new DOM, preserving read-only controls.
 if(name==='renderCalcParams'){const prior=renderCalcParams;renderCalcParams=function(){prior();applyParameterLock();};}
 if(name==='renderRentPhases'){const prior=renderRentPhases;renderRentPhases=function(){prior();applyParameterLock();};}
 if(name==='renderContractAdvanced'){const prior=renderContractAdvanced;renderContractAdvanced=function(){prior();applyParameterLock();};}
}
