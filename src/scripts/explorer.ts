const form=document.querySelector<HTMLFormElement>('#filters')!;
const search=document.querySelector<HTMLInputElement>('#search')!;
const stage=document.querySelector<HTMLSelectElement>('#stage')!;
const sourceType=document.querySelector<HTMLSelectElement>('#source-type')!;
const sort=document.querySelector<HTMLSelectElement>('#sort')!;
const body=document.querySelector<HTMLTableSectionElement>('#observations')!;
const rows=Array.from(body.rows);
const params=new URLSearchParams(location.search);
search.value=params.get('q')??'';
for(const [control,key] of [[stage,'stage'],[sourceType,'type'],[sort,'sort']] as const){const v=params.get(key);if(v&&Array.from(control.options).some(o=>o.value===v))control.value=v;}
const viewButtons=[document.querySelector<HTMLButtonElement>('#table-view')!,document.querySelector<HTMLButtonElement>('#radar-view')!];
let view=params.get('view')==='radar'?'radar':'table';
function update(){const query=search.value.trim().toLowerCase();let count=0;
const ordered=[...rows].sort((a,b)=>sort.value==='title'?a.dataset.title!.localeCompare(b.dataset.title!):sort.value==='oldest'?a.dataset.date!.localeCompare(b.dataset.date!):b.dataset.date!.localeCompare(a.dataset.date!));
for(const row of ordered){const show=(!query||row.dataset.search!.includes(query))&&(!stage.value||row.dataset.stage===stage.value)&&(!sourceType.value||row.dataset.type===sourceType.value);row.hidden=!show;if(show)count++;body.append(row);const point=document.querySelector<SVGAElement>(`[data-signal-id="${row.dataset.id}"]`);if(point){if(show)point.removeAttribute('display');else point.setAttribute('display','none');}}
document.querySelector('#result-count')!.textContent=`${count} of ${rows.length} observations`;
(document.querySelector('#empty') as HTMLElement).hidden=count>0;
(document.querySelector('#table-panel') as HTMLElement).hidden=view!=='table';
(document.querySelector('#radar-panel') as HTMLElement).hidden=view!=='radar';
viewButtons[0]!.setAttribute('aria-pressed',String(view==='table'));viewButtons[1]!.setAttribute('aria-pressed',String(view==='radar'));
const next=new URLSearchParams();for(const [k,v] of [['q',search.value],['stage',stage.value],['type',sourceType.value],['sort',sort.value==='newest'?'':sort.value],['view',view==='radar'?'radar':'']])if(v)next.set(k!,v);history.replaceState(null,'',location.pathname+(next.size?'?'+next:'')+location.hash);
}
form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',update);form.addEventListener('change',update);form.addEventListener('reset',()=>{queueMicrotask(()=>{view='table';update();});});
viewButtons[0]!.addEventListener('click',()=>{view='table';update();});viewButtons[1]!.addEventListener('click',()=>{view='radar';update();});
(document.querySelector('#view-controls') as HTMLElement).hidden=false;update();
