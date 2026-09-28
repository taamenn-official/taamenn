import type { Match } from '../data/footballData';
import { notificationWhen } from '../shared/formatting/matchPresentation.ts';
import { getAll, putItem, deleteItem, getItem } from './localDb.ts';

export type AppNotification = {
  id: string;
  type: 'match'|'system'|'tactical'|'archive';
  kind: 'match'|'system'|'tactical';
  event: MatchNotificationEvent | 'welcome';
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  message?: string;
  messageAr?: string;
  timestamp?: number;
  createdAt: number;
  read: boolean;
  relatedEntityId?: string;
};

export type MatchNotificationEvent =
  | 'created'
  | 'edited'
  | 'approaching'
  | 'started'
  | 'result-pending'
  | 'result-recorded'
  | 'archived'
  | 'shared'
  | 'shared-imported';

type EventLedger = { id:'notificationEvents'; ids:string[] };

const seed:AppNotification[]=[
 {id:'welcome',type:'system',kind:'system',event:'welcome',title:'TAAMEN 2.0',titleAr:'TAAMEN 2.0',body:'Your local notification center is ready.',bodyAr:'تم تجهيز مركز الإشعارات محليًا.',createdAt:Date.now()-86400000,read:false,timestamp:Date.now()-86400000},
];

export async function listNotifications(){
  const all=await getAll<AppNotification>('notifications');
  const hasBootstrapped=await getItem<{bootstrapped:boolean}>('appState','notificationBootstrap');
  if(hasBootstrapped===undefined || !hasBootstrapped.bootstrapped){
    for(const item of seed)await putItem('notifications',item);
    await putItem('appState',{id:'notificationBootstrap',bootstrapped:true});
  }
  return (await getAll<AppNotification>('notifications')).sort((a,b)=>b.createdAt-a.createdAt);
}
export async function unreadCount(){return (await listNotifications()).filter(n=>!n.read).length}
export async function markNotificationRead(id:string){const item=(await listNotifications()).find(n=>n.id===id);if(item)await putItem('notifications',{...item,read:true,timestamp:item.timestamp||item.createdAt})}
export async function markAllNotificationsRead(){for(const item of await listNotifications())if(!item.read)await putItem('notifications',{...item,read:true,timestamp:item.timestamp||item.createdAt})}
async function rememberEvent(id:string){
  const ledger=(await getItem<EventLedger>('appState','notificationEvents'))||{id:'notificationEvents',ids:[]};
  if(ledger.ids.includes(id))return;
  await putItem('appState',{...ledger,ids:[...ledger.ids.slice(-499),id]});
}

export async function deleteNotification(id:string){
  await rememberEvent(id);
  await deleteItem('notifications',id);
}
export async function clearNotifications(){
  for(const item of await listNotifications()){
    await rememberEvent(item.id);
    await deleteItem('notifications',item.id);
  }
}

async function notificationsEnabled(){
  const preferences=await getItem<{notifications?:boolean}>('settings','privacy');
  return preferences?.notifications!==false;
}

export type LedgerDecision = 'skip-known' | 'skip-disabled' | 'emit';

/** Disabled prefs must not consume the ledger, or the event is lost forever. */
export function notificationLedgerDecision(enabled: boolean, alreadyKnown: boolean): LedgerDecision {
  if (alreadyKnown) return 'skip-known';
  if (!enabled) return 'skip-disabled';
  return 'emit';
}

/** A toast is only for a notification emitOnce actually creates. */
export function notificationShouldAnnounce(decision: LedgerDecision) {
  return decision === 'emit';
}

export function announceNotification(item: AppNotification) {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent('taamen-notification', { detail: item }));
}

async function emitOnce(id:string,payload:Omit<AppNotification,'id'>){
  const ledger=(await getItem<EventLedger>('appState','notificationEvents'))||{id:'notificationEvents',ids:[]};
  const decision=notificationLedgerDecision(await notificationsEnabled(), ledger.ids.includes(id));
  if(!notificationShouldAnnounce(decision))return false;
  const created: AppNotification={id,...payload};
  await putItem('appState',{...ledger,ids:[...ledger.ids.slice(-499),id]});
  await putItem('notifications',created);
  announceNotification(created);
  return true;
}

function notificationCopy(match:Match,event:MatchNotificationEvent){
  const teams=`${match.team1} × ${match.team2}`;
  const score=`${match.score1}:${match.score2}`;
  const when={en:notificationWhen(match,'en'),ar:notificationWhen(match,'ar')};
  const rows:Record<MatchNotificationEvent,{title:string;titleAr:string;body:string;bodyAr:string;type:AppNotification['type'];kind:AppNotification['kind']}>={
    created:{title:'Match created',titleAr:'تم إنشاء المباراة',body:`${teams} was added to Match Center. ${when.en}`,bodyAr:`تمت إضافة ${teams} إلى مركز المباريات. ${when.ar}`,type:'match',kind:'match'},
    edited:{title:'Match updated',titleAr:'تم تحديث المباراة',body:`${teams} was updated. ${when.en}`,bodyAr:`تم تحديث ${teams}. ${when.ar}`,type:'match',kind:'match'},
    approaching:{title:'Match approaching',titleAr:'المباراة تقترب',body:`${teams}. ${when.en}`,bodyAr:`${teams}. ${when.ar}`,type:'match',kind:'match'},
    started:{title:'Match started',titleAr:'بدأت المباراة',body:`${teams} is now active. ${when.en}`,bodyAr:`بدأت الآن ${teams}. ${when.ar}`,type:'match',kind:'match'},
    'result-pending':{title:'Match finished',titleAr:'انتهت المباراة',body:`${teams} ended. Enter the final result.`,bodyAr:`انتهت ${teams}. أدخل النتيجة النهائية.`,type:'match',kind:'match'},
    'result-recorded':{title:'Result recorded',titleAr:'تم تسجيل النتيجة',body:`${teams} — ${score}`,bodyAr:`${teams} — ${score}`,type:'match',kind:'match'},
    archived:{title:'Match archived',titleAr:'تمت أرشفة المباراة',body:`${teams} is in the Archive.`,bodyAr:`تمت إضافة ${teams} إلى السجل.`,type:'archive',kind:'system'},
    shared:{title:'Share link created',titleAr:'تم إنشاء رابط المشاركة',body:`A local share link was created for ${teams}.`,bodyAr:`تم إنشاء رابط مشاركة محلي لـ ${teams}.`,type:'match',kind:'match'},
    'shared-imported':{title:'Shared match saved',titleAr:'تم حفظ المباراة المشتركة',body:`${teams} was saved locally.`,bodyAr:`تم حفظ ${teams} محليًا.`,type:'match',kind:'match'},
  };
  return rows[event];
}

export async function emitMatchNotification(match:Match,event:MatchNotificationEvent,now=Date.now()){
  const copy=notificationCopy(match,event);
  const id=`match:${match.id}:${event}`;
  return emitOnce(id,{
    ...copy,
    event,
    message:copy.body,
    messageAr:copy.bodyAr,
    createdAt:now,
    timestamp:now,
    read:false,
    relatedEntityId:match.id,
  });
}
