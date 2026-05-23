import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, Alert, Platform, Dimensions,
  Modal, SafeAreaView, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Rect, Line as SvgLine, Path, Circle, Text as SvgText, G } from 'react-native-svg';
import {
  BRISTOL, SC, ST, STICK, PCOLORS, SIZES,
  SZ_IDX, SZ_FS, BROWN, KEY, SKEY, ROW_H, DARK_HEX,
} from './src/constants';

const W = Dimensions.get('window').width;

// ─── Types ──────────────────────────────────────────────────────
interface Entry { id:number; ts:string; t:number; c:string; sz:string|null; n:string; }
interface Settings { autoExport:boolean; }

// ─── Helpers ────────────────────────────────────────────────────
const bi = (t:number) => BRISTOL.find(b=>b.type===t);
const ci = (id:string) => PCOLORS.find(c=>c.id===id);
const fmt = (iso:string) => {
  const d=new Date(iso);
  // Match original web version: zh-TW locale, M/D 上午/下午HH:MM
  try {
    return d.toLocaleDateString("zh-TW",{month:"numeric",day:"numeric"})+" "
         + d.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"});
  } catch {
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
};
const fmtS = (iso:string) => {
  const d=new Date(iso);
  try { return d.toLocaleDateString("zh-TW",{month:"numeric",day:"numeric"}); }
  catch { return `${d.getMonth()+1}/${d.getDate()}`; }
};

// ─── Card ────────────────────────────────────────────────────────
function Card({title,sub,children}:{title:string;sub?:string;children:React.ReactNode}) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {sub ? <Text style={s.cardSub}>{sub}</Text> : null}
      <View style={{marginTop:10}}>{children}</View>
    </View>
  );
}

// ─── Toggle ─────────────────────────────────────────────────────
function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}) {
  return (
    <TouchableOpacity onPress={()=>onChange(!on)} activeOpacity={0.8}
      style={[s.toggle,{backgroundColor:on?BROWN:'#ddd'}]}>
      <View style={[s.toggleThumb,{left:on?22:3}]}/>
    </TouchableOpacity>
  );
}

// ─── Combined chart: bars (categories) + line (sizes), same X-axis ──
// Matches the web version: left Y = score (0-3), right Y = size index (0-6)
function CategoryChart({data}:{data:any[]}) {
  const [sel, setSel] = useState<number|null>(null);

  if (!data || data.length<1) return <Text style={s.emptyChart}>需要至少 1 筆資料</Text>;

  const cw = W - 56;
  const h  = 200;
  const padL = 36, padR = 36, padT = 8, padB = 22;
  const plotW = cw - padL - padR;
  const plotH = h - padT - padB;
  const n = data.length;
  const slot = plotW / n;
  const barW = Math.max(6, slot * 0.6);

  // SWAPPED: left Y = score (curve), right Y = size (bar)
  const yScore = (v:number) => padT + (1 - v/3) * plotH;   // left axis
  const ySize  = (v:number) => padT + (1 - v/6) * plotH;   // right axis

  // Points for score line (curve on LEFT axis)
  const scorePts = data.map((d,i)=>{
    if (d.score == null) return null;
    const x = padL + slot*i + slot/2;
    return { x, y: yScore(d.score), hex: d.hex||BROWN, score: d.score };
  }).filter(Boolean) as any[];

  let pathD = '';
  scorePts.forEach((p,i)=>{ pathD += (i===0?'M':'L') + p.x + ',' + p.y + ' '; });

  const scoreTicks = [0,1,2,3];
  const sizeTicks  = [0,2,4,6];
  const STICK_LBL  = ['嚴重','中度','輕微','完美'];
  const SIZE_LBL   = SIZES;

  const selectedItem = sel!=null ? data[sel] : null;

  return (
    <View>
      <Svg width={cw} height={h}>
        {/* gridlines based on left axis */}
        {scoreTicks.map(v => (
          <SvgLine key={'g'+v} x1={padL} y1={yScore(v)} x2={cw-padR} y2={yScore(v)}
            stroke="#f0ecea" strokeWidth={1} strokeDasharray="3,3"/>
        ))}
        {/* Left Y ticks = score labels */}
        {scoreTicks.map(v => (
          <SvgText key={'sy'+v} x={padL-4} y={yScore(v)+3} fontSize={9} fill="#aaa" textAnchor="end">
            {STICK_LBL[v]}
          </SvgText>
        ))}
        {/* Right Y ticks = size labels */}
        {sizeTicks.map(v => (
          <SvgText key={'zy'+v} x={cw-padR+4} y={ySize(v)+3} fontSize={9} fill="#aaa" textAnchor="start">
            {SIZE_LBL[v]?SIZE_LBL[v].label:''}
          </SvgText>
        ))}

        {/* Bars = size, on RIGHT axis, colored by stool hex */}
        {data.map((d,i)=>{
          if (d.sIdx == null) return null;
          const x = padL + slot*i + (slot-barW)/2;
          const y = ySize(d.sIdx);
          const bh = plotH - (y-padT);
          const selectedRing = sel===i;
          return (
            <Rect key={'b'+i} x={x} y={y} width={barW} height={Math.max(bh,0)}
              rx={3} ry={3} fill={d.hex||BROWN}
              stroke={selectedRing?BROWN:'transparent'} strokeWidth={selectedRing?2:0}/>
          );
        })}

        {/* Score line on LEFT axis, brown */}
        {scorePts.length>=2 && (
          <Path d={pathD} stroke={BROWN} strokeWidth={2} fill="none"/>
        )}
        {scorePts.map((p,i)=>(
          <Circle key={'c'+i} cx={p.x} cy={p.y} r={4}
            fill={p.hex} stroke="#fff" strokeWidth={1.5}/>
        ))}

        {/* First/last X labels */}
        {n>0 && (
          <SvgText x={padL + slot/2} y={h-6} fontSize={8} fill="#aaa" textAnchor="middle">
            {data[0].label}
          </SvgText>
        )}
        {n>1 && (
          <SvgText x={padL + slot*(n-1) + slot/2} y={h-6} fontSize={8} fill="#aaa" textAnchor="middle">
            {data[n-1].label}
          </SvgText>
        )}
      </Svg>

      {/* Tap overlays */}
      <View style={{position:'absolute',left:0,top:0,width:cw,height:h,flexDirection:'row'}}
        pointerEvents="box-none">
        <View style={{width:padL}}/>
        {data.map((d,i)=>(
          <TouchableOpacity key={'t'+i} activeOpacity={0.6}
            onPress={()=>setSel(sel===i?null:i)}
            style={{width:slot,height:plotH,marginTop:padT}}/>
        ))}
      </View>

      {/* Tap tooltip */}
      {selectedItem && (
        <View style={{marginTop:8,padding:10,backgroundColor:'#fdfaf8',borderRadius:10,borderWidth:1,borderColor:'#f0e8e3'}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
            <Text style={{fontSize:12,fontWeight:'700',color:'#555'}}>{selectedItem.label}</Text>
            <TouchableOpacity onPress={()=>setSel(null)}>
              <Text style={{fontSize:14,color:'#bbb'}}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
            <Text style={{fontSize:14}}>{BRISTOL.find(b=>b.status===selectedItem.typeLabel)?.emoji||'💩'}</Text>
            <Text style={{fontSize:12,fontWeight:'700',color:'#333'}}>{selectedItem.typeLabel||'—'}</Text>
            <View style={{backgroundColor:SC[selectedItem.score]||BROWN,borderRadius:8,paddingHorizontal:5}}>
              <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>{selectedItem.score}分</Text>
            </View>
            <Text style={{fontSize:11,color:'#888'}}>{ST[selectedItem.score]||''}</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
            <Text style={{color:'#e07820'}}>📏</Text>
            <Text style={{fontSize:12,color:'#e07820',fontWeight:'600'}}>
              大小：{selectedItem.sIdx!=null?(SIZES[selectedItem.sIdx]?SIZES[selectedItem.sIdx].label:'—'):'—'}
            </Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{width:12,height:12,borderRadius:6,backgroundColor:selectedItem.hex||BROWN,borderWidth:1,borderColor:'#ccc'}}/>
            <Text style={{fontSize:12,color:'#555'}}>{selectedItem.colorLabel||'—'}</Text>
          </View>
        </View>
      )}

      {/* Static legend */}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:6,paddingHorizontal:4}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
          <View style={{width:10,height:10,borderRadius:2,backgroundColor:BROWN}}/>
          <Text style={{fontSize:10,color:'#666'}}>右長條 = 大小</Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
          <View style={{width:10,height:2,backgroundColor:BROWN}}/>
          <Text style={{fontSize:10,color:'#666'}}>左曲線 = 分類分數</Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
          <View style={{width:10,height:10,borderRadius:5,backgroundColor:'#8B4513',borderWidth:1,borderColor:'#ccc'}}/>
          <Text style={{fontSize:10,color:'#666'}}>顏色 = 大便顏色</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function App() {
  const [tab,      setTab]      = useState<'add'|'history'|'stats'>('add');
  const [entries,  setEntries]  = useState<Entry[]>([]);
  const [selType,  setSelType]  = useState<number|null>(null);
  const [selColor, setSelColor] = useState<string|null>(null);
  const [selSize,  setSelSize]  = useState<string|null>(null);
  const [note,     setNote]     = useState('');
  const [dt,       setDt]       = useState(new Date());

  const [toast,    setToast]    = useState(false);
  const [editId,   setEditId]   = useState<number|null>(null);
  const [editDt,   setEditDt]   = useState(new Date());
  const [editSz,   setEditSz]   = useState<string|null>(null);
  const [editCol,  setEditCol]  = useState<string|null>(null);
  const [editType, setEditType] = useState<number|null>(null);
  const [editDtMode, setEditDtMode] = useState<'none'|'date'|'time'>('none');
  const [dtMode, setDtMode] = useState<'none'|'date'|'time'>('none');
  const [confirmClear, setConfirmClear] = useState(false);
  const [period,   setPeriod]   = useState<'all'|'week'|'day'|'date'>('all');
  const [selDate,  setSelDate]  = useState(new Date());
  const [showSelDate, setShowSelDate] = useState(false);
  const [wOff,     setWOff]     = useState(0);
  const [settings, setSettings] = useState<Settings>({autoExport:false});

  useEffect(()=>{
    (async()=>{
      try {
        const r = await AsyncStorage.getItem(KEY);
        if(r) setEntries(JSON.parse(r));
        const ss = await AsyncStorage.getItem(SKEY);
        if(ss) setSettings(JSON.parse(ss));
      } catch {}
    })();
  },[]);

  const persist = async (arr:Entry[]) => {
    try { await AsyncStorage.setItem(KEY,JSON.stringify(arr)); } catch {}
  };
  const updSetting = async (k:keyof Settings, v:boolean) => {
    const n={...settings,[k]:v}; setSettings(n);
    try { await AsyncStorage.setItem(SKEY,JSON.stringify(n)); } catch {}
  };

  const exportData = async (data:Entry[]=entries) => {
    try {
      const json = JSON.stringify(data,null,2);
      const fname = `poop_log_${new Date().toISOString().slice(0,10)}.json`;
      const path = FileSystem.cacheDirectory + fname;
      await FileSystem.writeAsStringAsync(path,json,{encoding:FileSystem.EncodingType.UTF8});
      await Sharing.shareAsync(path,{mimeType:'application/json',dialogTitle:'匯出大便日誌'});
    } catch(e) { Alert.alert('匯出失敗',String(e)); }
  };

  const importData = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({type:'application/json'});
      if(res.canceled) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri,{encoding:FileSystem.EncodingType.UTF8});
      const d = JSON.parse(text);
      if(Array.isArray(d)){ setEntries(d); await persist(d); Alert.alert('✅ 匯入成功',`已載入 ${d.length} 筆紀錄`); }
    } catch(e) { Alert.alert('匯入失敗','檔案格式錯誤'); }
  };

  const add = async () => {
    if(!selType||!selColor) return;
    const e:Entry = {id:Date.now(),ts:dt.toISOString(),t:selType,c:selColor,sz:selSize,n:note};
    const next = [e,...entries].sort((a,b)=>new Date(b.ts).getTime()-new Date(a.ts).getTime());
    setEntries(next); await persist(next);
    setSelType(null); setSelColor(null); setSelSize(null); setNote(''); setDt(new Date());
    setToast(true); setTimeout(()=>setToast(false),2000);
    // 不再自動分享，需手動到「備份設定」按「立即匯出」
  };

  const del = async (id:number) => {
    const n=entries.filter(e=>e.id!==id); setEntries(n); await persist(n);
  };
  const startEdit = (e:Entry) => {
    setEditId(e.id); setEditDt(new Date(e.ts)); setEditSz(e.sz||null); setEditCol(e.c||null); setEditType(e.t||null);
  };
  const saveEdit = async (id:number) => {
    const n=entries.map(e=>e.id===id?{...e,ts:editDt.toISOString(),sz:editSz,c:editCol,t:editType??e.t}:e)
      .sort((a,b)=>new Date(b.ts).getTime()-new Date(a.ts).getTime());
    setEntries(n); await persist(n); setEditId(null);
  };

  // ── Filtering ────────────────────────────────────────────────
  const now = new Date();
  const getWR = (off:number) => {
    const mon=new Date(now); mon.setDate(now.getDate()-(now.getDay()||7)+1+off*7); mon.setHours(0,0,0,0);
    const sun=new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999);
    return {start:mon,end:sun};
  };
  const wr = getWR(wOff);
  const wLabel = `${wr.start.getMonth()+1}/${wr.start.getDate()} – ${wr.end.getMonth()+1}/${wr.end.getDate()}`;
  const filtered = period==='day' ? entries.filter(e=>new Date(e.ts).toDateString()===now.toDateString())
    : period==='week' ? entries.filter(e=>{const d=new Date(e.ts);return d>=wr.start&&d<=wr.end;})
    : period==='date' ? entries.filter(e=>new Date(e.ts).toDateString()===selDate.toDateString())
    : entries;

  const recent = [...filtered].reverse().slice(-15);
  const ideal  = filtered.filter(e=>e.t===4).length;
  const avgScore = filtered.length
    ? (filtered.reduce((s,e)=>s+(bi(e.t)?.score??0),0)/filtered.length).toFixed(1) : '—';

  const scoreData = recent.map(e=>({
    label: fmtS(e.ts),
    score: bi(e.t)?.score??0,
    hex:   ci(e.c)?.hex??BROWN,
    sIdx:  e.sz&&SZ_IDX[e.sz]!=null ? SZ_IDX[e.sz] : null,
    typeLabel: bi(e.t)?.status??'',
    colorLabel: ci(e.c)?.label??'',
  }));
  const sizeData = recent.filter(e=>e.sz&&SZ_IDX[e.sz]!=null).map(e=>({
    label:fmtS(e.ts), val:SZ_IDX[e.sz!], hex:ci(e.c)?.hex??BROWN,
  }));

  // ── Item base style ──────────────────────────────────────────
  const itemBase = (sel:boolean, accent:string) => ({
    height: ROW_H, flexDirection:'row' as const, alignItems:'center' as const,
    borderRadius:8, marginBottom:4, cursor:'pointer',
    borderWidth:2, borderColor: sel?BROWN:'#eee',
    borderLeftWidth:4, borderLeftColor: accent,
    backgroundColor: sel?'#fdf1ea':'#fff',
    paddingHorizontal:6,
  });

  // ════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BROWN}/>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>💩 大便日誌</Text>
        <Text style={s.headerSub}>紀錄 · 分析 · 了解腸道健康</Text>
      </View>

      {/* Toast */}
      {toast && (
        <View style={s.toast}><Text style={s.toastTxt}>✅ 已儲存！</Text></View>
      )}

      <View style={{flex:1}}>
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:14,paddingBottom:80}}>

          {/* ══ ADD TAB ══ */}
          {tab==='add' && (
            <View>
              {/* 日期時間 + 儲存按鈕 */}
              <View style={{flexDirection:'row',gap:8,marginBottom:12}}>
                <TouchableOpacity onPress={()=>setDtMode('date')} style={[s.card,{flex:1,marginBottom:0}]}>
                  <Text style={{fontSize:10,color:'#aaa',marginBottom:2}}>📅 日期與時間</Text>
                  <Text style={{fontSize:13,color:'#333',fontWeight:'600'}}>
                    {fmt(dt.toISOString())}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={add}
                  style={[s.saveBtn,{opacity:(!selType||!selColor)?0.45:1}]}
                  disabled={!selType||!selColor}>
                  <Text style={{fontSize:26}}>💩</Text>
                  <Text style={{color:'#fff',fontSize:11,fontWeight:'800'}}>儲存</Text>
                </TouchableOpacity>
              </View>
              {dtMode==='date' && (
                <DateTimePicker value={dt} mode="date" display="spinner"
                  onChange={(_,d)=>{
                    if(d){ setDt(prev=>{const n=new Date(prev);n.setFullYear(d.getFullYear(),d.getMonth(),d.getDate());return n;}); setDtMode('time'); }
                    else setDtMode('none');
                  }}/>
              )}
              {dtMode==='time' && (
                <DateTimePicker value={dt} mode="time" display="spinner" is24Hour={true}
                  onChange={(_,d)=>{
                    setDtMode('none');
                    if(d){ setDt(prev=>{const n=new Date(prev);n.setHours(d.getHours(),d.getMinutes(),0,0);return n;}); }
                  }}/>
              )}

              <Card title="分類 · 大小 · 顏色" sub="分類和顏色必填">
                <View style={{flexDirection:'row',gap:6}}>

                  {/* 分類 */}
                  <View style={{flex:4}}>
                    <Text style={s.colHeader}>分類</Text>
                    {BRISTOL.map(b=>(
                      <TouchableOpacity key={b.type} onPress={()=>setSelType(b.type)}
                        style={itemBase(selType===b.type,b.sc)} activeOpacity={0.7}>
                        <Text style={{fontSize:18,marginRight:4}}>{b.emoji}</Text>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:11,fontWeight:'700',color:b.sc}} numberOfLines={1}>{b.status}</Text>
                          <View style={{backgroundColor:SC[b.score],borderRadius:6,alignSelf:'flex-start',paddingHorizontal:4,marginTop:1}}>
                            <Text style={{color:'#fff',fontSize:9}}>{b.score}分</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 大小 */}
                  <View style={{flex:3}}>
                    <Text style={s.colHeader}>大小</Text>
                    {SIZES.map(sz=>(
                      <TouchableOpacity key={sz.id} onPress={()=>setSelSize(selSize===sz.id?null:sz.id)}
                        style={[itemBase(selSize===sz.id,'#e07820'),{flexDirection:'column',justifyContent:'center',paddingHorizontal:4}]}
                        activeOpacity={0.7}>
                        <Text style={{fontSize:SZ_FS[sz.id]}}>💩</Text>
                        <Text style={{fontSize:10,fontWeight:'700',marginTop:2}}>{sz.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 顏色 */}
                  <View style={{flex:3}}>
                    <Text style={s.colHeader}>顏色</Text>
                    {PCOLORS.map(pc=>{
                      const sel=selColor===pc.id;
                      const isDark=DARK_HEX.includes(pc.hex);
                      return (
                        <TouchableOpacity key={pc.id} onPress={()=>setSelColor(pc.id)}
                          style={{height:ROW_H,borderRadius:8,marginBottom:4,
                            backgroundColor:sel?pc.hex:'#fff',
                            borderWidth:2,borderColor:sel?pc.hex:'#eee',
                            alignItems:'center',justifyContent:'center'}}
                          activeOpacity={0.7}>
                          {!sel && <View style={{width:15,height:15,borderRadius:8,backgroundColor:pc.hex,borderWidth:1,borderColor:'#ccc',marginBottom:2}}/>}
                          <Text style={{fontSize:10,fontWeight:'700',color:sel?(isDark?'#fff':'#333'):'#333'}}>{pc.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                </View>
              </Card>

              <Card title="備註" sub="選填">
                <TextInput
                  value={note} onChangeText={setNote}
                  placeholder="例：腹痛、用力、有血絲…"
                  placeholderTextColor="#bbb"
                  multiline style={s.noteInput}/>
              </Card>
            </View>
          )}

          {/* ══ HISTORY TAB ══ */}
          {tab==='history' && (
            <View>
              {/* 一鍵清除 */}
              {entries.length>0 && (
                <View style={{marginBottom:10}}>
                  {!confirmClear
                    ? <TouchableOpacity onPress={()=>setConfirmClear(true)}
                        style={s.clearBtn} activeOpacity={0.8}>
                        <Text style={s.clearBtnTxt}>🗑️ 一鍵清除全部</Text>
                      </TouchableOpacity>
                    : <View style={s.clearConfirm}>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#c0392b',textAlign:'center',marginBottom:4}}>
                          ⚠️ 確定要清除所有 {entries.length} 筆紀錄？
                        </Text>
                        <Text style={{fontSize:11,color:'#e07820',textAlign:'center',marginBottom:10}}>此操作無法復原</Text>
                        <View style={{flexDirection:'row',gap:8}}>
                          <TouchableOpacity onPress={()=>setConfirmClear(false)}
                            style={[s.confirmBtn,{backgroundColor:'#f0ebe7'}]}>
                            <Text style={{color:'#555',fontWeight:'700'}}>取消</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={async()=>{setEntries([]);await AsyncStorage.setItem(KEY,'[]');setConfirmClear(false);}}
                            style={[s.confirmBtn,{backgroundColor:'#c0392b'}]}>
                            <Text style={{color:'#fff',fontWeight:'700'}}>確定清除</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                  }
                </View>
              )}

              {entries.length===0
                ? <View style={{alignItems:'center',paddingVertical:60}}>
                    <Text style={{fontSize:56}}>💩</Text>
                    <Text style={{color:'#bbb',fontSize:15,marginTop:12}}>還沒有紀錄</Text>
                  </View>
                : entries.map(e=>{
                  const b=bi(e.t), c=ci(e.c), isEd=editId===e.id;
                  const szLabel=e.sz?(SIZES.find(s=>s.id===e.sz)?.label??e.sz):null;
                  return (
                    <View key={e.id} style={s.histItem}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                        <Text style={{fontSize:28}}>{b?.emoji??'?'}</Text>
                        <View style={{flex:1}}>
                          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3}}>
                            <Text style={{fontSize:13,fontWeight:'700',color:b?.sc??'#999'}}>{b?.status??'未知'}</Text>
                            <View style={{backgroundColor:SC[b?.score??0],borderRadius:10,paddingHorizontal:6,paddingVertical:1}}>
                              <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>{b?.score??0}分</Text>
                            </View>
                          </View>
                          <View style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                            {c && <View style={{flexDirection:'row',alignItems:'center',gap:3}}>
                              <View style={{width:11,height:11,borderRadius:6,backgroundColor:c.hex,borderWidth:1,borderColor:'#ccc'}}/>
                              <Text style={{fontSize:11,color:'#555'}}>{c.label}</Text>
                            </View>}
                            {szLabel && <View style={{backgroundColor:'#f0e8e3',borderRadius:6,paddingHorizontal:6,paddingVertical:1}}>
                              <Text style={{fontSize:10,color:BROWN}}>{szLabel}</Text>
                            </View>}
                            <Text style={{fontSize:10,color:'#aaa'}}>· {fmt(e.ts)}</Text>
                          </View>
                          {e.n ? <Text style={{fontSize:11,color:'#999',marginTop:3}} numberOfLines={1}>{e.n}</Text> : null}
                        </View>
                        <View style={{flexDirection:'row',gap:2}}>
                          <TouchableOpacity onPress={()=>isEd?setEditId(null):startEdit(e)} style={s.iconBtn}>
                            <Text style={{fontSize:18,opacity:isEd?1:0.3}}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={()=>Alert.alert('刪除','確定刪除這筆紀錄？',[
                            {text:'取消',style:'cancel'},{text:'刪除',style:'destructive',onPress:()=>del(e.id)}
                          ])} style={s.iconBtn}>
                            <Text style={{fontSize:18,opacity:0.3}}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {isEd && (
                        <View style={s.editBox}>
                          <Text style={s.editLabel}>⏰ 時間</Text>
                          <TouchableOpacity onPress={()=>setEditDtMode('date')} style={s.editDateBtn}>
                            <Text style={{color:BROWN,fontWeight:'600'}}>{fmt(editDt.toISOString())}</Text>
                          </TouchableOpacity>
                          {editDtMode==='date' && (
                            <DateTimePicker value={editDt} mode="date" display="spinner"
                              onChange={(_,d)=>{
                                if(d){ setEditDt(prev=>{const n=new Date(prev);n.setFullYear(d.getFullYear(),d.getMonth(),d.getDate());return n;}); setEditDtMode('time'); }
                                else setEditDtMode('none');
                              }}/>
                          )}
                          {editDtMode==='time' && (
                            <DateTimePicker value={editDt} mode="time" display="spinner" is24Hour={true}
                              onChange={(_,d)=>{
                                setEditDtMode('none');
                                if(d){ setEditDt(prev=>{const n=new Date(prev);n.setHours(d.getHours(),d.getMinutes(),0,0);return n;}); }
                              }}/>
                          )}
                          <Text style={[s.editLabel,{marginTop:8}]}>💩 分類</Text>
                          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:4}}>
                            {BRISTOL.map(bb=>(
                              <TouchableOpacity key={bb.type} onPress={()=>setEditType(bb.type)}
                                style={[s.editChip,{borderColor:editType===bb.type?BROWN:'#eee',backgroundColor:editType===bb.type?'#fdf1ea':'#fff',flexDirection:'row',gap:5,borderLeftWidth:4,borderLeftColor:bb.sc}]}>
                                <Text style={{fontSize:13}}>{bb.emoji}</Text>
                                <Text style={{fontSize:11,fontWeight:editType===bb.type?'700':'400',color:bb.sc}}>{bb.status}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={[s.editLabel,{marginTop:8}]}>📏 大小</Text>
                          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:4}}>
                            {SIZES.map(sz=>(
                              <TouchableOpacity key={sz.id} onPress={()=>setEditSz(editSz===sz.id?null:sz.id)}
                                style={[s.editChip,{borderColor:editSz===sz.id?BROWN:'#eee',backgroundColor:editSz===sz.id?'#fdf1ea':'#fff'}]}>
                                <Text style={{fontSize:12,fontWeight:editSz===sz.id?'700':'400',color:'#333'}}>{sz.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={[s.editLabel,{marginTop:8}]}>🎨 顏色</Text>
                          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:4}}>
                            {PCOLORS.map(pc=>(
                              <TouchableOpacity key={pc.id} onPress={()=>setEditCol(pc.id)}
                                style={[s.editChip,{borderColor:editCol===pc.id?BROWN:'#eee',backgroundColor:editCol===pc.id?'#fdf1ea':'#fff',flexDirection:'row',gap:5}]}>
                                <View style={{width:12,height:12,borderRadius:6,backgroundColor:pc.hex,borderWidth:1,borderColor:'#ccc'}}/>
                                <Text style={{fontSize:11,fontWeight:editCol===pc.id?'700':'400',color:'#333'}}>{pc.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TouchableOpacity onPress={()=>saveEdit(e.id)} style={s.saveEditBtn}>
                            <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>✅ 儲存修改</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              }
            </View>
          )}

          {/* ══ STATS TAB ══ */}
          {tab==='stats' && (
            <View>
              {/* 期間選擇 */}
              <View style={s.periodRow}>
                {(['all','week','day','date'] as const).map(p=>(
                  <TouchableOpacity key={p} onPress={()=>setPeriod(p)}
                    style={[s.periodBtn,{backgroundColor:period===p?BROWN:'transparent'}]}>
                    <Text style={[s.periodTxt,{color:period===p?'#fff':'#aaa',fontWeight:period===p?'700':'400'}]}>
                      {p==='all'?'全部':p==='week'?'週':p==='day'?'今日':'日期'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {period==='week' && (
                <View style={s.weekNav}>
                  <TouchableOpacity onPress={()=>setWOff(w=>w-1)} style={s.weekArrow}>
                    <Text style={{fontSize:22,color:BROWN}}>‹</Text>
                  </TouchableOpacity>
                  <Text style={{fontSize:13,fontWeight:'700',color:'#444'}}>{wLabel}</Text>
                  <TouchableOpacity onPress={()=>setWOff(w=>Math.min(w+1,0))} style={s.weekArrow}>
                    <Text style={{fontSize:22,color:wOff<0?BROWN:'#ccc'}}>›</Text>
                  </TouchableOpacity>
                </View>
              )}

              {period==='date' && (
                <TouchableOpacity onPress={()=>setShowSelDate(true)} style={[s.card,{marginBottom:12}]}>
                  <Text style={{fontSize:10,color:'#aaa',marginBottom:2}}>📅 選擇日期</Text>
                  <Text style={{fontSize:14,fontWeight:'700',color:BROWN}}>
                    {selDate.toLocaleDateString('zh-TW',{year:'numeric',month:'long',day:'numeric'})}
                  </Text>
                </TouchableOpacity>
              )}
              {showSelDate && (
                <DateTimePicker value={selDate} mode="date" display="spinner"
                  onChange={(_,d)=>{setShowSelDate(false);if(d)setSelDate(d);}}/>
              )}

              {/* 統計數字 */}
              <View style={{flexDirection:'row',gap:10,marginBottom:12}}>
                {[{v:filtered.length,l:'總紀錄',bg:'#fdf1ea',c:BROWN},
                  {v:ideal,l:'理想次數',bg:'#f0fdf4',c:'#27ae60'},
                  {v:avgScore,l:'平均分數',bg:'#f0fdf4',c:'#27ae60'}].map((s2,i)=>(
                  <View key={i} style={{flex:1,backgroundColor:s2.bg,borderRadius:12,padding:12,alignItems:'center'}}>
                    <Text style={{fontSize:26,fontWeight:'800',color:s2.c}}>{s2.v}</Text>
                    <Text style={{fontSize:11,color:'#888',marginTop:2}}>{s2.l}</Text>
                  </View>
                ))}
              </View>

              {/* 分類趨勢 */}
              <Card title="📈 分類趨勢" sub="右長條高度=大小 | 左曲線=分類分數 | 顏色=大便顏色">
                <CategoryChart data={scoreData}/>
              </Card>

              {/* 分類分佈 */}
              <Card title="分類分佈" sub="">
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                  {BRISTOL.map(b=>{
                    const cnt=filtered.filter(e=>e.t===b.type).length;
                    const pct=filtered.length?Math.round(cnt/filtered.length*100):0;
                    return (
                      <View key={b.type} style={s.distItem}>
                        <Text style={{fontSize:16}}>{b.emoji}</Text>
                        <View style={{flex:1}}>
                          <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                            <Text style={{fontSize:11,fontWeight:'700',color:b.sc}}>{b.status}</Text>
                            <View style={{backgroundColor:SC[b.score],borderRadius:6,paddingHorizontal:4}}>
                              <Text style={{color:'#fff',fontSize:9}}>{b.score}分</Text>
                            </View>
                          </View>
                          <View style={{backgroundColor:'#f0e8e3',borderRadius:4,height:4,marginTop:3}}>
                            <View style={{backgroundColor:b.sc,borderRadius:4,height:4,width:`${pct}%` as any}}/>
                          </View>
                        </View>
                        <Text style={{fontSize:12,fontWeight:'700',color:'#555',minWidth:22,textAlign:'right'}}>{cnt}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* 大小分佈 */}
              <Card title="大小分佈" sub="">
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                  {SIZES.map(sz=>{
                    const cnt=filtered.filter(e=>e.sz===sz.id).length;
                    const pct=filtered.length?Math.round(cnt/filtered.length*100):0;
                    return (
                      <View key={sz.id} style={s.distItem}>
                        <Text style={{fontSize:SZ_FS[sz.id],minWidth:22,textAlign:'center'}}>💩</Text>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:12,fontWeight:'700',color:'#333'}}>{sz.label}</Text>
                          <View style={{backgroundColor:'#f0e8e3',borderRadius:4,height:4,marginTop:3}}>
                            <View style={{backgroundColor:BROWN,borderRadius:4,height:4,width:`${pct}%` as any}}/>
                          </View>
                        </View>
                        <Text style={{fontSize:12,fontWeight:'700',color:'#555',minWidth:22,textAlign:'right'}}>{cnt}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* 顏色分佈 */}
              <Card title="顏色分佈" sub="">
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                  {PCOLORS.map(pc=>{
                    const cnt=filtered.filter(e=>e.c===pc.id).length;
                    const pct=filtered.length?Math.round(cnt/filtered.length*100):0;
                    return (
                      <View key={pc.id} style={s.distItem}>
                        <View style={{width:14,height:14,borderRadius:7,backgroundColor:pc.hex,borderWidth:1,borderColor:'#ccc'}}/>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:12,fontWeight:'700',color:'#333'}}>{pc.label}</Text>
                          <View style={{backgroundColor:'#f0e8e3',borderRadius:4,height:4,marginTop:3}}>
                            <View style={{backgroundColor:pc.hex,borderRadius:4,height:4,width:`${pct}%` as any}}/>
                          </View>
                        </View>
                        <Text style={{fontSize:12,fontWeight:'700',color:'#555',minWidth:22,textAlign:'right'}}>{cnt}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* 備份設定 */}
              <Card title="📦 備份設定" sub="">
                <View style={{marginBottom:14}}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:13,fontWeight:'700'}}>自動存檔</Text>
                      <Text style={{fontSize:11,color:'#aaa',marginTop:1}}>每次儲存時自動分享備份</Text>
                    </View>
                    <Toggle on={settings.autoExport} onChange={v=>updSetting('autoExport',v)}/>
                  </View>
                </View>
                <View style={{flexDirection:'row',gap:8}}>
                  <TouchableOpacity onPress={()=>exportData()} style={s.exportBtn}>
                    <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>⬇️ 立即匯出</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={importData} style={s.importBtn}>
                    <Text style={{color:BROWN,fontSize:13,fontWeight:'700'}}>⬆️ 匯入還原</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}

        </ScrollView>

        {/* Bottom Tab Bar */}
        <View style={s.tabBar}>
          {([{id:'add',icon:'➕',label:'新增'},{id:'history',icon:'📋',label:'紀錄'},{id:'stats',icon:'📊',label:'統計'}] as const).map(t=>(
            <TouchableOpacity key={t.id} onPress={()=>setTab(t.id)} style={s.tabItem} activeOpacity={0.7}>
              <Text style={{fontSize:22}}>{t.icon}</Text>
              <Text style={{fontSize:11,fontWeight:tab===t.id?'700':'400',color:tab===t.id?BROWN:'#bbb'}}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex:1, backgroundColor:'#f4f1ef' },
  header:       { backgroundColor:BROWN, paddingVertical:14, paddingHorizontal:20, alignItems:'center' },
  headerTitle:  { fontSize:20, fontWeight:'800', color:'#fff', letterSpacing:1 },
  headerSub:    { fontSize:11, color:'rgba(255,255,255,0.75)', marginTop:2 },
  toast:        { position:'absolute', top:70, alignSelf:'center', backgroundColor:'#27ae60',
                  paddingVertical:10, paddingHorizontal:24, borderRadius:24, zIndex:99,
                  shadowColor:'#000', shadowOpacity:0.2, shadowRadius:8, elevation:6 },
  toastTxt:     { color:'#fff', fontSize:14, fontWeight:'600' },
  card:         { backgroundColor:'#fff', borderRadius:14, padding:16, marginBottom:12,
                  shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  cardTitle:    { fontSize:14, fontWeight:'700', color:'#333' },
  cardSub:      { fontSize:11, color:'#aaa', marginTop:1 },
  colHeader:    { fontSize:11, fontWeight:'700', color:'#aaa', textAlign:'center', marginBottom:4 },
  saveBtn:      { paddingHorizontal:16, backgroundColor:BROWN, borderRadius:12,
                  alignItems:'center', justifyContent:'center', gap:2 },
  noteInput:    { borderWidth:1.5, borderColor:'#e0d9d4', borderRadius:8, padding:10,
                  fontSize:13, minHeight:68, color:'#333', backgroundColor:'#fdfaf8',
                  textAlignVertical:'top' },
  clearBtn:     { alignSelf:'flex-end', backgroundColor:'#fff0f0', borderWidth:1.5,
                  borderColor:'#f5c6c6', borderRadius:8, paddingVertical:8, paddingHorizontal:14 },
  clearBtnTxt:  { color:'#c0392b', fontSize:13, fontWeight:'700' },
  clearConfirm: { backgroundColor:'#fff0f0', borderWidth:1.5, borderColor:'#f5c6c6',
                  borderRadius:10, padding:14 },
  confirmBtn:   { flex:1, paddingVertical:10, borderRadius:8, alignItems:'center' },
  histItem:     { backgroundColor:'#fff', borderRadius:12, padding:14, marginBottom:10,
                  shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  iconBtn:      { padding:6 },
  editBox:      { marginTop:10, paddingTop:10, borderTopWidth:1, borderTopColor:'#f0ebe7' },
  editLabel:    { fontSize:11, color:'#888', marginBottom:4 },
  editDateBtn:  { borderWidth:1.5, borderColor:'#e0d9d4', borderRadius:8, padding:10, backgroundColor:'#fdfaf8' },
  editChip:     { paddingVertical:5, paddingHorizontal:8, borderRadius:7, borderWidth:1.5, flexDirection:'row', alignItems:'center' },
  saveEditBtn:  { marginTop:10, backgroundColor:BROWN, borderRadius:8, padding:10, alignItems:'center' },
  periodRow:    { flexDirection:'row', gap:6, marginBottom:8, backgroundColor:'#fff',
                  borderRadius:12, padding:5, shadowColor:'#000', shadowOpacity:0.06, elevation:2 },
  periodBtn:    { flex:1, paddingVertical:9, borderRadius:8, alignItems:'center' },
  periodTxt:    { fontSize:13 },
  weekNav:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                  marginBottom:12, backgroundColor:'#fff', borderRadius:10, padding:8,
                  shadowColor:'#000', shadowOpacity:0.06, elevation:2 },
  weekArrow:    { paddingHorizontal:8 },
  distItem:     { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fdfaf8',
                  borderRadius:8, padding:10, width:'47%' },
  exportBtn:    { flex:1, padding:10, backgroundColor:BROWN, borderRadius:8, alignItems:'center' },
  importBtn:    { flex:1, padding:10, backgroundColor:'#f0ebe7', borderRadius:8, alignItems:'center' },
  emptyChart:   { textAlign:'center', color:'#ccc', padding:20, fontSize:13 },
  toggle:       { width:44, height:24, borderRadius:12, position:'relative' },
  toggleThumb:  { position:'absolute', top:3, width:18, height:18, borderRadius:9,
                  backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.3, shadowRadius:2, elevation:2 },
  tabBar:       { flexDirection:'row', backgroundColor:'#fff', borderTopWidth:1,
                  borderTopColor:'#ece5e0', height:62 },
  tabItem:      { flex:1, alignItems:'center', justifyContent:'center', gap:2 },
});
