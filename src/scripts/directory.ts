const input=document.querySelector<HTMLInputElement>('#directory-search')!;
const count=document.querySelector<HTMLSelectElement>('#directory-count')!;
const rows=Array.from(document.querySelectorAll<HTMLLIElement>('.directory li'));
const params=new URLSearchParams(location.search);input.value=params.get('q')??'';
if(['all','observed','watchlist'].includes(params.get('count')??''))count.value=params.get('count')!;
function update(){let visible=0;for(const row of rows){const observed=Number(row.dataset.count)>0;row.hidden=!row.textContent!.toLowerCase().includes(input.value.trim().toLowerCase())||(count.value==='observed'&&!observed)||(count.value==='watchlist'&&observed);if(!row.hidden)visible++;}document.querySelector('#directory-results')!.textContent=`${visible} of ${rows.length} entries`;const next=new URLSearchParams();if(input.value)next.set('q',input.value);if(count.value!=='all')next.set('count',count.value);history.replaceState(null,'',location.pathname+(next.size?'?'+next:''));}
document.querySelector('#directory-filters')!.addEventListener('submit',e=>e.preventDefault());input.addEventListener('input',update);count.addEventListener('change',update);update();

export {};
