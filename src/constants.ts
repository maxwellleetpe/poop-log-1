export const BRISTOL = [
  { type:1, score:0, emoji:'🪨', status:'嚴重便秘', cat:'便秘', sc:'#c0392b' },
  { type:2, score:1, emoji:'🌭', status:'輕度便秘', cat:'便秘', sc:'#e67e22' },
  { type:3, score:2, emoji:'🌽', status:'正常偏硬', cat:'理想', sc:'#27ae60' },
  { type:4, score:3, emoji:'🍌', status:'✨ 理想',  cat:'理想', sc:'#27ae60' },
  { type:5, score:2, emoji:'🫘', status:'正常偏軟', cat:'理想', sc:'#27ae60' },
  { type:6, score:1, emoji:'💧', status:'輕度腹瀉', cat:'腹瀉', sc:'#e67e22' },
  { type:7, score:0, emoji:'🌊', status:'嚴重腹瀉', cat:'腹瀉', sc:'#c0392b' },
];
export const SC    = ['#c0392b','#e67e22','#2ecc71','#27ae60'];
export const ST    = ['嚴重異常','中度異常','輕微異常','完美'];
export const STICK = ['嚴重','中度','輕微','完美'];
export const PCOLORS = [
  {id:'brown', label:'棕色', hex:'#8B4513'},
  {id:'yellow',label:'黃色', hex:'#DAA520'},
  {id:'red',   label:'紅色', hex:'#C0392B'},
  {id:'black', label:'黑色', hex:'#212121'},
  {id:'orange',label:'橘色', hex:'#E07820'},
  {id:'green', label:'綠色', hex:'#2E7D32'},
  {id:'gray',  label:'灰白', hex:'#9E9E9E'},
];
export const SIZES = [
  {id:'xs',label:'極少'},{id:'s',label:'少'},{id:'sm',label:'偏少'},
  {id:'m',label:'普通'},{id:'ml',label:'偏多'},{id:'l',label:'多'},{id:'xl',label:'超多'},
];
export const SZ_IDX: Record<string,number> = {xs:0,s:1,sm:2,m:3,ml:4,l:5,xl:6};
export const SZ_FS:  Record<string,number> = {xs:12,s:14,sm:17,m:21,ml:25,l:29,xl:33};
export const BROWN = '#6B3A2A';
export const KEY   = 'poop_log_v1';
export const SKEY  = 'poop_settings_v1';
export const ROW_H = 52;
export const DARK_HEX = ['#212121','#2E7D32','#8B4513','#C0392B'];
