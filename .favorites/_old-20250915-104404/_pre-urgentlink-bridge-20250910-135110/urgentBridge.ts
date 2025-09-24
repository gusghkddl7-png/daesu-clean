'use client';
export type UrgentRow = { id:string; anchorId:string; moveIn:string; days:number; rowHTML:string; };
const PFX = 'urgent:v2:';
const KEY_ROWS=PFX+'rows', KEY_THEAD=PFX+'thead', KEY_COLG=PFX+'colgroup', KEY_TCLASS=PFX+'tclass', KEY_INFO=PFX+'info';

export const listRows=()=>{ try{return JSON.parse(localStorage.getItem(KEY_ROWS)||'[]')}catch{return[]} };
export const saveRows=(rows:UrgentRow[])=>{ try{const v=JSON.stringify(rows);localStorage.setItem(KEY_ROWS,v);window.dispatchEvent(new StorageEvent('storage',{key:KEY_ROWS,newValue:v} as any))}catch{} };

export const getThead=()=>{ try{return localStorage.getItem(KEY_THEAD)}catch{return null} };
export const setThead=(h:string)=>{ try{localStorage.setItem(KEY_THEAD,h);window.dispatchEvent(new StorageEvent('storage',{key:KEY_THEAD,newValue:h} as any))}catch{} };

export const getColgroup=()=>{ try{return localStorage.getItem(KEY_COLG)}catch{return null} };
export const setColgroup=(h:string)=>{ try{localStorage.setItem(KEY_COLG,h);window.dispatchEvent(new StorageEvent('storage',{key:KEY_COLG,newValue:h} as any))}catch{} };

export const getTableClass=()=>{ try{return localStorage.getItem(KEY_TCLASS)}catch{return null} };
export const setTableClass=(c:string)=>{ try{localStorage.setItem(KEY_TCLASS,c);window.dispatchEvent(new StorageEvent('storage',{key:KEY_TCLASS,newValue:c} as any))}catch{} };

export const setInfo=(msg:string)=>{ try{localStorage.setItem(KEY_INFO,msg);window.dispatchEvent(new StorageEvent('storage',{key:KEY_INFO,newValue:msg} as any))}catch{} };
