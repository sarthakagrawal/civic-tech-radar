import raw from '../../data/radar.json';
export const radar=raw;
export const base=import.meta.env.BASE_URL.replace(/\/$/,'')+'/';
export const href=(path='')=>base+path.replace(/^\//,'');
export const display=(value:string|null|undefined)=>value||'Unknown';
export const dateLabel=(value:string)=>new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
