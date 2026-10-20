/* Collapse the navigation without changing the active page or contract form. */
(()=>{
 const sidebar=document.getElementById('appSidebar'),toggle=document.getElementById('sidebarToggle');
 const storageKey='leaseSidebarCollapsed.v1';
 let saved=null;
 try{saved=localStorage.getItem(storageKey);}catch{}
 let collapsed=saved===null?window.matchMedia('(max-width:760px)').matches:saved==='true';
 function render(){
  document.body.classList.add('sidebar-ready');
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  const label=collapsed?'展开侧栏':'收起侧栏';
  toggle.setAttribute('aria-expanded',String(!collapsed));
  toggle.setAttribute('aria-label',label);toggle.title=label;
  toggle.querySelector('span').textContent=collapsed?'›':'‹';
 }
 function labelMenus(){
  sidebar.querySelectorAll(':scope > button[data-page]').forEach(button=>{
   const label=Array.from(button.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim()||button.textContent.trim();
   button.title=label;button.setAttribute('aria-label',label);
  });
 }
 toggle.addEventListener('click',()=>{
  collapsed=!collapsed;render();
  try{localStorage.setItem(storageKey,String(collapsed));}catch{}
 });
 // Disclosure and contract menus are installed after their data loads.
 new MutationObserver(labelMenus).observe(sidebar,{childList:true});
 labelMenus();render();
})();
