import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Camera, Maximize2, Minimize2, Move, RotateCcw, X, Undo2, Redo2, Save, Share2 } from 'lucide-react';
import { formations, genericTacticalPlayers } from '../data/tacticalPresets';
import type { TacticalPlayer } from '../data/footballData';
import type { Formation } from '../data/tacticalPresets';
import { getItem, putItem } from '../services/localDb';
import { requestLandscape, releaseOrientation } from '../services/tacticalOrientation';
import { canvasToPngBlob, html2canvas } from '../utils/capture';
import { copyPngToClipboard, saveCapture } from '../services/screenshotService';
import { tacticalCopy, uiCopy } from '../i18n/translations';
import { isCompactViewport, prefersReducedMotion } from '../motion/prefersReduced';
import {
  applyFormation, derivedPosition, grabOffset, movePlayerTo, nudgePlayer,
  pointWithGrab, pointerToPitchPercent, readStoredPlayers, renamePlayer, samePoint, setCaptain,
  type GrabOffset, type PitchPoint, type SnapMode,
} from '../services/tacticalBoard';
import '../styles/tactical-board.css';

const instructions=['','pressForward','coverDepth','stayWide','dropBack','betweenLines'] as const;
const teamRoles=['','captain','playmaker','defensiveLeader','freePlayer','attackLeader'] as const;
const UNDO_LIMIT=20;
const DRAG_SLOP=8;
const HOLD_MS=460;

const defaultFormation=formations[0];

function defaultPlayers(language:'ar'|'en'):TacticalPlayer[]{
  const copy=tacticalCopy[language];
  const named=genericTacticalPlayers.map((player,index)=>({
    ...player,
    name:`${copy.player} ${index%5+1}`,
  }));
  return applyFormation(named,defaultFormation);
}

type StoredPlan={id:string;formationId:string;players:TacticalPlayer[];landscape?:boolean};
type Snapshot={players:TacticalPlayer[];formationId:string};
type Gesture={
  pointerId:number;
  playerId:string;
  startX:number;
  startY:number;
  grab:GrabOffset;
  moved:boolean;
  dragging:boolean;
  held:boolean;
  timer:number;
  point:PitchPoint|null;
};

function FormationMark({formation}:{formation:Formation}){
  const dots=[...formation.positions.home.map(point=>({...point,away:false})),...formation.positions.away.map(point=>({...point,away:true}))];
  return <svg className="formation-mark" viewBox="0 0 100 58" aria-hidden="true">
    {dots.map(point=><circle key={`${point.away?'a':'h'}-${point.x}-${point.y}`} cx={point.x} cy={point.y*0.58} r={point.away?3.2:3.6} className={point.away?'is-away':undefined}/>)}
  </svg>;
}

export default function Tactical({language}:{language:'ar'|'en'}){
 const copy=uiCopy[language];
 const tactical=tacticalCopy[language];
 const [formationId,setFormationId]=useState(defaultFormation.id);
 const [players,setPlayers]=useState<TacticalPlayer[]>(()=>defaultPlayers(language));
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [saved,setSaved]=useState(false);
 const [planNote,setPlanNote]=useState<{kind:'ok'|'err';text:string}|null>(null);
 const [capturing,setCapturing]=useState(false);
 const [captureNote,setCaptureNote]=useState<{kind:'ok'|'warn'|'err';text:string}|null>(null);
 const [landscape,setLandscape]=useState(false);
 const [undoStack,setUndoStack]=useState<Snapshot[]>([]);
 const [redoStack,setRedoStack]=useState<Snapshot[]>([]);
 const [snapMode,setSnapMode]=useState<SnapMode>('off');
 const [editingName,setEditingName]=useState(false);
 const [nameDraft,setNameDraft]=useState('');
 const pitchRef=useRef<HTMLDivElement>(null);
 const tokens=useRef(new Map<string,HTMLButtonElement>());
 const live=useRef(players);
 const gesture=useRef<Gesture|null>(null);
 const frame=useRef(0);
 const pending=useRef<{x:number;y:number}|null>(null);
 const animating=useRef(false);
 const animFrame=useRef(0);
 const snapRef=useRef(snapMode);
 const savedTimer=useRef(0);
 const captureTimer=useRef(0);
 const desktopName=useRef<HTMLInputElement>(null);
 const mobileName=useRef<HTMLInputElement>(null);
 const nameSaveLock=useRef(false);
 const languageRef=useRef(language);
 languageRef.current=language;
 live.current=players;
 snapRef.current=snapMode;

 const formation=formations.find(item=>item.id===formationId)||defaultFormation;
 const formationCopy=tactical.formations[formation.id as keyof typeof tactical.formations]||{name:formation.id,description:''};
 const selected=selectedId?players.find(player=>player.id===selectedId)||null:null;

 useEffect(()=>{
  getItem<StoredPlan>('tactical','plan').then(stored=>{
   if(!stored)return;
   if(formations.some(item=>item.id===stored.formationId))setFormationId(stored.formationId);
   setPlayers(readStoredPlayers(stored.players,defaultPlayers(languageRef.current)));
   setLandscape(Boolean(stored.landscape));
  });
 },[]);

 useEffect(()=>{
  document.body.classList.toggle('tactical-focus-mode',landscape);
  return()=>{document.body.classList.remove('tactical-focus-mode');releaseOrientation()};
 },[landscape]);

 useEffect(()=>()=>{
  window.clearTimeout(savedTimer.current);
  window.clearTimeout(captureTimer.current);
  window.clearTimeout(gesture.current?.timer);
  cancelAnimationFrame(frame.current);
  cancelAnimationFrame(animFrame.current);
 },[]);

 useEffect(()=>{
  setNameDraft(selected?.name??'');
  setEditingName(false);
 },[selectedId]);

 useEffect(()=>{
  if(!editingName)return;
  const field=window.matchMedia('(max-width: 900px)').matches?mobileName.current:desktopName.current;
  field?.focus();
  field?.select();
 },[editingName]);

 useLayoutEffect(()=>{
  if(gesture.current?.dragging||animating.current)return;
  tokens.current.forEach(element=>{
   element.style.transform='';
   element.classList.remove('is-dragging','is-moving');
  });
 },[players]);

 const persist=useCallback(async(nextPlayers:TacticalPlayer[],nextFormationId:string,nextLandscape:boolean)=>{
  await putItem('tactical',{id:'plan',formationId:nextFormationId,players:nextPlayers,landscape:nextLandscape});
  setSaved(true);
  window.clearTimeout(savedTimer.current);
  savedTimer.current=window.setTimeout(()=>setSaved(false),1800);
 },[]);

 const commit=useCallback((next:TacticalPlayer[],previous:TacticalPlayer[],nextFormationId=formationId)=>{
  setUndoStack(history=>[...history.slice(-(UNDO_LIMIT-1)),{players:previous,formationId}]);
  setRedoStack([]);
  setFormationId(nextFormationId);
  setPlayers(next);
  persist(next,nextFormationId,landscape);
 },[formationId,landscape,persist]);

 const undo=useCallback(()=>{
  setUndoStack(history=>{
   const previous=history.at(-1);
   if(!previous)return history;
   setRedoStack(future=>[...future,{players:live.current,formationId}]);
   setFormationId(previous.formationId);
   setPlayers(previous.players);
   persist(previous.players,previous.formationId,landscape);
   return history.slice(0,-1);
  });
 },[formationId,landscape,persist]);

 const redo=useCallback(()=>{
  setRedoStack(history=>{
   const next=history.at(-1);
   if(!next)return history;
   setUndoStack(past=>[...past,{players:live.current,formationId}]);
   setFormationId(next.formationId);
   setPlayers(next.players);
   persist(next.players,next.formationId,landscape);
   return history.slice(0,-1);
  });
 },[formationId,landscape,persist]);

 const actions=useRef({undo,redo,commit,selectedId,formationId});
 actions.current={undo,redo,commit,selectedId,formationId};

 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement|null;
   const typing=Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
   const key=event.key.toLowerCase();
   if((event.metaKey||event.ctrlKey)&&key==='z'&&!typing){
    event.preventDefault();
    if(event.shiftKey)actions.current.redo();
    else actions.current.undo();
    return;
   }
   if(typing)return;
   if(event.key==='Escape'){setSelectedId(null);setEditingName(false);return;}
   const id=actions.current.selectedId;
   if(!id)return;
   const step=event.shiftKey?4:1;
   const delta=event.key==='ArrowLeft'?[-step,0]:event.key==='ArrowRight'?[step,0]:event.key==='ArrowUp'?[0,-step]:event.key==='ArrowDown'?[0,step]:null;
   if(!delta)return;
   event.preventDefault();
   const previous=live.current;
   const next=nudgePlayer(previous,id,delta[0],delta[1]);
   if(next!==previous)actions.current.commit(next,previous);
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[]);

 const paint=useCallback(()=>{
  frame.current=0;
  const current=gesture.current;
  const sample=pending.current;
  const rect=pitchRef.current?.getBoundingClientRect();
  if(!current?.dragging||!sample||!rect)return;
  const pointer=pointerToPitchPercent(sample.x,sample.y,rect);
  const point=pointWithGrab(pointer,current.grab,snapRef.current);
  current.point=point;
  const player=live.current.find(item=>item.id===current.playerId);
  const element=tokens.current.get(current.playerId);
  if(!player||!element)return;
  const dx=((point.x-player.x)/100)*rect.width;
  const dy=((point.y-player.y)/100)*rect.height;
  element.style.transform=`translate(-50%, -50%) translate3d(${dx}px, ${dy}px, 0) scale(1.08)`;
 },[]);

 const changeFormation=(id:string)=>{
  const nextFormation=formations.find(item=>item.id===id);
  if(!nextFormation||animating.current||id===formationId)return;
  const previous=live.current;
  const targets=applyFormation(previous,nextFormation);
  const pitch=pitchRef.current;
  if(prefersReducedMotion()||!pitch){
   setFormationId(id);
   commit(targets,previous,id);
   return;
  }
  animating.current=true;
  const started=performance.now();
  const duration=isCompactViewport()?260:340;
  const tick=(now:number)=>{
   const progress=Math.min(1,(now-started)/duration);
   const eased=1-Math.pow(1-progress,3);
   const rect=pitch.getBoundingClientRect();
   for(const player of previous){
    const target=targets.find(item=>item.id===player.id);
    const element=tokens.current.get(player.id);
    if(!target||!element)continue;
    element.classList.add('is-moving');
    const dx=((target.x-player.x)/100)*rect.width*eased;
    const dy=((target.y-player.y)/100)*rect.height*eased;
    element.style.transform=`translate(-50%, -50%) translate3d(${dx}px, ${dy}px, 0)`;
   }
   if(progress<1){animFrame.current=requestAnimationFrame(tick);return;}
   animating.current=false;
   setFormationId(id);
   commit(targets,previous,id);
  };
  animFrame.current=requestAnimationFrame(tick);
 };

 const updateSelected=(patch:Partial<TacticalPlayer>)=>{
  if(!selected)return;
  const next=patch.captain!==undefined
   ? setCaptain(players,selected.id,patch.captain)
   : players.map(player=>player.id===selected.id?{...player,...patch}:player);
  commit(next,players);
 };

 const saveName=()=>{
  if(nameSaveLock.current||!selected)return;
  nameSaveLock.current=true;
  const previous=live.current;
  const next=renamePlayer(previous,selected.id,nameDraft,tactical.player);
  setEditingName(false);
  const changed=next.find(player=>player.id===selected.id)?.name!==selected.name;
  if(changed)commit(next,previous);
  window.setTimeout(()=>{nameSaveLock.current=false;},0);
 };

 const cancelName=()=>{
  setNameDraft(selected?.name??'');
  setEditingName(false);
 };

 const onPointerDown=(playerId:string,event:React.PointerEvent<HTMLButtonElement>)=>{
  if(gesture.current||animating.current)return;
  if(event.button!==0)return;
  const player=live.current.find(item=>item.id===playerId);
  const rect=pitchRef.current?.getBoundingClientRect();
  if(!player||!rect)return;
  const pointer=pointerToPitchPercent(event.clientX,event.clientY,rect);
  const timer=window.setTimeout(()=>{
   if(gesture.current?.pointerId===event.pointerId)gesture.current.held=true;
  },HOLD_MS);
  gesture.current={
   pointerId:event.pointerId,playerId,startX:event.clientX,startY:event.clientY,
   grab:grabOffset(player,pointer),moved:false,dragging:false,held:false,timer,point:null,
  };
  setSelectedId(playerId);
  event.currentTarget.setPointerCapture?.(event.pointerId);
 };

 const onPointerMove=(event:React.PointerEvent<HTMLButtonElement>)=>{
  const current=gesture.current;
  if(!current||current.pointerId!==event.pointerId)return;
  const distance=Math.hypot(event.clientX-current.startX,event.clientY-current.startY);
  if(!current.dragging&&distance<DRAG_SLOP)return;
  if(!current.dragging){
   window.clearTimeout(current.timer);
   current.dragging=true;
   current.moved=true;
   tokens.current.get(current.playerId)?.classList.add('is-dragging');
  }
  pending.current={x:event.clientX,y:event.clientY};
  if(!frame.current)frame.current=requestAnimationFrame(paint);
 };

 const finishDrag=(event:React.PointerEvent<HTMLButtonElement>)=>{
  const current=gesture.current;
  if(!current||current.pointerId!==event.pointerId)return;
  window.clearTimeout(current.timer);
  cancelAnimationFrame(frame.current);
  frame.current=0;
  gesture.current=null;
  const element=tokens.current.get(current.playerId);
  element?.classList.remove('is-dragging');
  if(current.dragging&&current.point){
   const previous=live.current;
   const player=previous.find(item=>item.id===current.playerId);
   if(player&&!samePoint(player,current.point)){
    commit(movePlayerTo(previous,current.playerId,current.point),previous);
    return;
   }
  }else if(current.held){
   setEditingName(true);
  }
  if(element)element.style.transform='';
 };

 const captureTactical=async()=>{
  if(!pitchRef.current||capturing)return;
  setCapturing(true);
  setCaptureNote(null);
  try{
   const target=pitchRef.current;
   const blobPromise=(async()=>{
    const canvas=await html2canvas(target);
    const blob=await canvasToPngBlob(canvas);
    return {blob,width:canvas.width,height:canvas.height};
   })();
   const clipboardPromise=copyPngToClipboard(blobPromise.then(result=>result.blob));
   const {blob,width,height}=await blobPromise;
   await saveCapture(blob,`TAAMEN tactical ${new Date().toISOString().slice(0,10)}`,{width,height});
   const clipboard=await clipboardPromise;
   setCaptureNote(clipboard==='copied'
     ?{kind:'ok',text:copy.captureCopied}
     :{kind:'warn',text:copy.captureSavedNoClipboard});
   window.clearTimeout(captureTimer.current);
   captureTimer.current=window.setTimeout(()=>setCaptureNote(null),5000);
  }catch{
   setCaptureNote({kind:'err',text:copy.captureFailed});
  }finally{setCapturing(false)}
 };

 const toggleLandscape=async()=>{
  const next=!landscape;
  setLandscape(next);
  const shouldLock=next&&window.matchMedia('(pointer: coarse)').matches&&window.innerWidth<=900;
  if(shouldLock)await requestLandscape();
  else if(!next)await releaseOrientation();
  persist(players,formationId,next);
 };

 const sharePlan=async()=>{
  const text=`${tactical.shareTitle}: ${formationCopy.name}`;
  try{
    if(navigator.share){
      await navigator.share({title:tactical.shareTitle,text});
      return;
    }
  }catch(error){
    if(error instanceof DOMException && error.name==='AbortError')return;
  }
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      setPlanNote({kind:'ok',text:copy.tacticalShareCopied});
      return;
    }
  }catch{/* fall through */}
  setPlanNote({kind:'err',text:copy.tacticalShareFailed});
 };

 const resetPlan=()=>{
  const fresh=defaultPlayers(language);
  setFormationId(defaultFormation.id);
  setSelectedId(null);
  commit(fresh,players,defaultFormation.id);
 };

 const nameField=(ref:React.RefObject<HTMLInputElement|null>)=><input
  ref={ref}
  dir="auto"
  value={nameDraft}
  aria-label={tactical.playerName}
  onChange={event=>setNameDraft(event.target.value)}
  onBlur={saveName}
  onKeyDown={event=>{
   if(event.key==='Enter'){event.preventDefault();saveName();}
   if(event.key==='Escape'){event.preventDefault();cancelName();}
  }}
 />;

 return <section className={`page-content tactical-page ${landscape?'is-landscape':''}`}>
  <div className="page-heading">
   <div>
    <p className="eyebrow">TAAMEN 2.0 / TACTICAL</p>
    <h1>{tactical.title}</h1>
    <p className="subtitle">{tactical.description}</p>
   </div>
   <div className="tactical-toolbar">
    <div className="formation-picker" role="group" aria-label={tactical.formationsLabel}>
     {formations.map(item=>{
      const label=tactical.formations[item.id as keyof typeof tactical.formations]?.name||item.id;
      return <button type="button" className={`formation-option${item.id===formationId?' is-selected':''}`} aria-pressed={item.id===formationId} onClick={()=>changeFormation(item.id)} key={item.id}>
       <FormationMark formation={item}/>
       <span>{label}</span>
      </button>;
     })}
    </div>
    <div className="tactical-snap" role="group" aria-label={tactical.snap}>
     <button type="button" aria-pressed={snapMode==='off'} onClick={()=>setSnapMode('off')}>{tactical.snapOff}</button>
     <button type="button" aria-pressed={snapMode==='soft'} onClick={()=>setSnapMode('soft')}>{tactical.snapSoft}</button>
    </div>
    <button className="dark-action landscape-action" onClick={toggleLandscape} aria-pressed={landscape} title={landscape?tactical.exitFocusTitle:tactical.expandTitle}>{landscape?<Minimize2 size={15}/>:<Maximize2 size={15}/>} <span>{landscape?tactical.exitFocus:tactical.focus}</span></button>
    <span className="tactical-save" role="status">{saved?tactical.saved:''}</span>
   </div>
  </div>
  <div className="tactical-layout">
   <div ref={pitchRef} className="pitch">
    <div className="pitch-midline"/><div className="pitch-circle"/><div className="pitch-center-spot"/>
    <div className="penalty-box penalty-home"/><div className="penalty-box penalty-away"/>
    <div className="goal-box goal-home"/><div className="goal-box goal-away"/>
    <div className="goal-area goal-area-home"/><div className="goal-area goal-area-away"/>
    <div className="penalty-spot penalty-spot-home"/><div className="penalty-spot penalty-spot-away"/>
    <span className="corner-arc corner-tl"/><span className="corner-arc corner-tr"/><span className="corner-arc corner-bl"/><span className="corner-arc corner-br"/>
    {players.map(player=>{
     const role=derivedPosition(player);
     return <button
      type="button"
      key={player.id}
      ref={node=>{if(node)tokens.current.set(player.id,node);else tokens.current.delete(player.id);}}
      aria-pressed={selectedId===player.id}
      aria-label={`${player.name} · ${role}`}
      className={`player-token ${player.team}${selectedId===player.id?' selected':''}${role==='GK'?' is-keeper':''}`}
      style={{left:`${player.x}%`,top:`${player.y}%`}}
      onPointerDown={event=>onPointerDown(player.id,event)}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onDoubleClick={()=>setEditingName(true)}
      title={`${player.name} · ${role}`}
     ><span>{player.name.slice(0,1)}</span><small dir="auto">{player.name}</small><em className="player-position">{role}</em>{player.captain&&<i aria-label={tactical.captain}>★</i>}</button>;
    })}
   </div>
   <section className="panel tactical-summary">
    <div className="tactical-ops-top"><span className="status-chip">{players.length===10?tactical.ready:tactical.playersRequired}</span><div className="ops-actions">
     <button className="icon-button" onClick={undo} disabled={!undoStack.length} aria-label={tactical.undo}><Undo2 size={15}/></button>
     <button className="icon-button" onClick={redo} disabled={!redoStack.length} aria-label={tactical.redo}><Redo2 size={15}/></button>
     <button className={`icon-button${capturing?' is-capturing':''}`} onClick={captureTactical} disabled={capturing} aria-busy={capturing} aria-label={copy.capturePitchAria} title={copy.capturePitchAria}>{capturing?<span className="capture-spinner"/>:<Camera size={15}/>}</button>
     <button className="icon-button landscape-exit" onClick={toggleLandscape} aria-label={tactical.exitTacticalFocus}>{landscape?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</button>
    </div></div>
    <p className="eyebrow">PLAN / {formation.id}</p><h2>{formationCopy.name}</h2><p>{formationCopy.description}</p>
    <div className="tactical-help"><span>{tactical.drag}</span><span>{tactical.tap}</span><span>{tactical.changeFormation}</span><span>{tactical.useFocus}</span></div>
    {selected?<div className="player-inspector floating-inspector">
     <div className="inspector-head"><strong>{tactical.editPlayer}</strong><button className="icon-button" onClick={()=>setSelectedId(null)} aria-label={tactical.closeEditor}><X size={15}/></button></div>
     <label>{tactical.playerName}{editingName?nameField(desktopName):<button type="button" className="dark-action" onClick={()=>setEditingName(true)}>{selected.name}</button>}</label>
     <div className="derived-position"><span>{tactical.autoPosition}</span><strong>{derivedPosition(selected)}</strong><small>{tactical.positionHelp}</small></div>
     <label>{tactical.role}<select value={selected.teamRole} onChange={event=>updateSelected({teamRole:event.target.value})}>{teamRoles.map(role=><option key={role} value={role}>{role?tactical.roles[role as keyof typeof tactical.roles]:'—'}</option>)}</select></label>
     <label>{tactical.instruction}<select value={selected.instruction} onChange={event=>updateSelected({instruction:event.target.value})}>{instructions.map(item=><option key={item} value={item}>{item?tactical.instructions[item as keyof typeof tactical.instructions]:'—'}</option>)}</select></label>
     <div className="setting-row"><span>{tactical.captain}</span><input type="checkbox" checked={selected.captain} onChange={event=>updateSelected({captain:event.target.checked})}/></div>
     <div className="inspector-actions"><button className="dark-action" onClick={()=>persist(players,formationId,landscape)}><Save size={15}/>{tactical.savePlan}</button><button className="text-button" onClick={()=>void sharePlan()}><Share2 size={14}/>{tactical.share}</button></div>
    </div>:<div className="inspector-empty"><Move/><strong>{tactical.selectPlayer}</strong><span>{tactical.selectHelp}</span></div>}
    <button className="text-button" onClick={resetPlan}><RotateCcw size={14}/>{tactical.reset}</button>
    {planNote&&<small className={`capture-note is-${planNote.kind}`} role={planNote.kind==='err'?'alert':'status'}>{planNote.text}</small>}
    {captureNote&&<small className={`capture-note is-${captureNote.kind}`} role={captureNote.kind==='err'?'alert':undefined}>{captureNote.text}</small>}
   </section>
  </div>
  {selected&&<div className="tactical-mobile-bar">
   {editingName?<>
    {nameField(mobileName)}
    <button type="button" className="dark-action" onMouseDown={event=>event.preventDefault()} onClick={saveName}>{tactical.saveName}</button>
    <button type="button" className="text-button" onMouseDown={event=>event.preventDefault()} onClick={cancelName}>{tactical.cancelName}</button>
   </>:<>
    <strong dir="auto">{selected.name}</strong>
    <span className="player-position">{derivedPosition(selected)}</span>
    <button type="button" className="dark-action" onClick={()=>setEditingName(true)}>{tactical.editName}</button>
   </>}
  </div>}
 </section>;
}
