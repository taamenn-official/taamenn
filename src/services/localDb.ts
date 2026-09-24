const DB_NAME='taamen-2';
const DB_VERSION=5;
export type StoreName='profile'|'settings'|'matches'|'archive'|'notifications'|'tactical'|'screenshots'|'sharedItems'|'preferences'|'appState'|'syncQueue'|'metadata';
const STORES:StoreName[]=['profile','settings','matches','archive','notifications','tactical','screenshots','sharedItems','preferences','appState','syncQueue','metadata'];
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,DB_VERSION);
  request.onupgradeneeded=()=>{
    const db=request.result;
    for(const name of STORES)if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});
  };
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db)};
  request.onerror=()=>reject(request.error);
})}
async function tx<T>(store:StoreName,mode:IDBTransactionMode,work:(s:IDBObjectStore)=>IDBRequest|void):Promise<T|undefined>{const db=await openDb();return new Promise((resolve,reject)=>{const t=db.transaction(store,mode),s=t.objectStore(store);let r:IDBRequest|void;try{r=work(s)}catch(e){db.close();reject(e);return}t.oncomplete=()=>{resolve(r?(r.result as T):undefined);db.close()};t.onerror=()=>{reject(t.error);db.close()}})}
export async function getItem<T>(s:StoreName,id:string){return tx<T>(s,'readonly',x=>x.get(id))}
export async function getAll<T>(s:StoreName){return (await tx<T[]>(s,'readonly',x=>x.getAll()))||[]}
export async function putItem<T extends {id:string}>(s:StoreName,v:T){await tx(s,'readwrite',x=>x.put(v))}
export async function deleteItem(s:StoreName,id:string){await tx(s,'readwrite',x=>x.delete(id))}
export async function clearStore(s:StoreName){await tx(s,'readwrite',x=>x.clear())}
export async function resetTaamenData(){for(const s of STORES)await clearStore(s)}
export async function seedMatches(seed:unknown[]){if((await getAll('matches')).length)return;for(const m of seed as Array<{id:string}>)await putItem('matches',m)}
export async function seedNotifications(seed:unknown[]){if((await getAll('notifications')).length)return;for(const m of seed as Array<{id:string}>)await putItem('notifications',m)}
export async function getStorageEstimate(){try{return await navigator.storage?.estimate()}catch{return undefined}}
export const MAX_BACKUP_BYTES=32*1024*1024;
const MAX_BACKUP_ROWS=2000;
const MAX_BACKUP_DEPTH=8;
const FORBIDDEN_KEYS=new Set(['__proto__','constructor','prototype']);
export type BackupEnvelope={format:'taamen-backup';version:1|2|3;sourceVersion?:1|2|3;createdAt:string;stores:Partial<Record<StoreName,unknown[]>>};
export class BackupError extends Error{
  readonly code:'invalid'|'unsupported-version';
  constructor(code:'invalid'|'unsupported-version'){
    super(code==='unsupported-version'?'Unsupported TAAMEN backup version':'Invalid TAAMEN backup');
    this.name='BackupError';
    this.code=code;
  }
}
function assertBackupShape(value:unknown,depth:number){
  if(depth>MAX_BACKUP_DEPTH)throw new BackupError('invalid');
  if(Array.isArray(value)){
    if(value.length>MAX_BACKUP_ROWS)throw new BackupError('invalid');
    for(const item of value)assertBackupShape(item,depth+1);
    return;
  }
  if(!value||typeof value!=='object')return;
  const record=value as Record<string,unknown>;
  for(const key of Object.keys(record)){
    if(FORBIDDEN_KEYS.has(key))throw new BackupError('invalid');
    assertBackupShape(record[key],depth+1);
  }
}
export function parseBackupEnvelope(x:unknown):BackupEnvelope{
  if(!x||typeof x!=='object'||Array.isArray(x))throw new BackupError('invalid');
  const b=x as Record<string,unknown>;
  if(Object.keys(b).some(key=>FORBIDDEN_KEYS.has(key)))throw new BackupError('invalid');
  if(b.format!=='taamen-backup')throw new BackupError('invalid');
  if(typeof b.version!=='number')throw new BackupError('invalid');
  if(![1,2,3].includes(b.version))throw new BackupError('unsupported-version');
  if(!b.stores||typeof b.stores!=='object'||Array.isArray(b.stores))throw new BackupError('invalid');
  const stores=b.stores as Record<string,unknown>;
  for(const key of Object.keys(stores)){
    if(FORBIDDEN_KEYS.has(key)||!STORES.includes(key as StoreName))throw new BackupError('invalid');
    if(!Array.isArray(stores[key]))throw new BackupError('invalid');
  }
  assertBackupShape(stores,0);
  return{format:'taamen-backup',version:3,sourceVersion:b.version as 1|2|3,createdAt:typeof b.createdAt==='string'?b.createdAt:new Date().toISOString(),stores:stores as BackupEnvelope['stores']};
}
function recordsForStore(raw:unknown):Array<{id:string}>{
  if(!Array.isArray(raw))return [];
  const out:Array<{id:string}>=[];
  for(const item of raw){
    if(item&&typeof item==='object'&&typeof(item as{id?:unknown}).id==='string'&&(item as{id:string}).id.trim())out.push(item as{id:string});
  }
  return out;
}
export function collectBackupPuts(envelope:BackupEnvelope):Array<{store:StoreName;item:{id:string}}>{
  const puts:Array<{store:StoreName;item:{id:string}}>=[];
  const seen=new Set<string>();
  for(const s of STORES){
    const target=s==='archive'?'matches':s;
    for(const item of recordsForStore(envelope.stores[s])){
      const key=`${target}:${item.id}`;
      if(seen.has(key))continue;
      seen.add(key);
      puts.push({store:target,item});
    }
  }
  return puts;
}
async function putMany(items:Array<{store:StoreName;item:{id:string}}>){
  if(!items.length)return;
  const db=await openDb();
  const names=[...new Set(items.map(i=>i.store))];
  await new Promise<void>((resolve,reject)=>{
    const t=db.transaction(names,'readwrite');
    t.oncomplete=()=>{db.close();resolve()};
    t.onerror=()=>{db.close();reject(t.error)};
    t.onabort=()=>{db.close();reject(t.error)};
    for(const {store,item} of items)t.objectStore(store).put(item);
  });
}
type SerializedBlob={__taamenBlob:true;type:string;data:string};
function bytesToBase64(bytes:Uint8Array){let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary)}
function base64ToBytes(value:string){const binary=atob(value);return Uint8Array.from(binary,char=>char.charCodeAt(0))}
async function serializeValue(value:unknown):Promise<unknown>{
  if(value instanceof Blob)return{__taamenBlob:true,type:value.type,data:bytesToBase64(new Uint8Array(await value.arrayBuffer()))} satisfies SerializedBlob;
  if(Array.isArray(value))return Promise.all(value.map(serializeValue));
  if(value&&typeof value==='object'){
    const out:Record<string,unknown>={};
    for(const[key,item]of Object.entries(value))out[key]=await serializeValue(item);
    return out;
  }
  return value;
}
function reviveValue(value:unknown):unknown{
  if(Array.isArray(value))return value.map(reviveValue);
  if(value&&typeof value==='object'){
    const record=value as Record<string,unknown>;
    if(record.__taamenBlob===true&&typeof record.data==='string')return new Blob([base64ToBytes(record.data)],{type:typeof record.type==='string'?record.type:''});
    return Object.fromEntries(Object.entries(record).map(([key,item])=>[key,reviveValue(item)]));
  }
  return value;
}
function validRecord(store:StoreName,item:{id:string}){
  if(store==='matches'){
    const match=item as Record<string,unknown>;
    return typeof match.team1==='string'&&typeof match.team2==='string'&&Number.isFinite(Number(match.dateKey));
  }
  if(store==='screenshots'){
    const capture=item as Record<string,unknown>;
    return capture.blob instanceof Blob&&typeof capture.createdAt==='number';
  }
  return true;
}
const STRICT_BACKUP_STORES:StoreName[]=['matches','archive','screenshots'];
/** Reject a malformed backup before any local write. */
export function assertBackupRecordsValid(stores:BackupEnvelope['stores']){
  for(const store of STRICT_BACKUP_STORES){
    const rows=stores[store];
    if(rows===undefined)continue;
    if(!Array.isArray(rows))throw new BackupError('invalid');
    const target=store==='archive'?'matches':store;
    for(const row of rows){
      if(row==null)continue;
      if(typeof row!=='object')throw new BackupError('invalid');
      const item=row as {id?:unknown};
      if(typeof item.id!=='string'||!item.id.trim())throw new BackupError('invalid');
      const match=row as {visibility?:unknown;source?:unknown};
      if(match.visibility==='PRIVATE'||match.source==='legacy'||match.source==='featured')throw new BackupError('invalid');
      if(!validRecord(target,row as {id:string}))throw new BackupError('invalid');
    }
  }
}
export async function exportTaamenBackup():Promise<BackupEnvelope>{
  const stores:BackupEnvelope['stores']={};
  for(const store of STORES){
    if(store==='archive')continue;
    stores[store]=await serializeValue(await getAll(store)) as unknown[];
  }
  return{format:'taamen-backup',version:3,createdAt:new Date().toISOString(),stores};
}
export async function importTaamenBackup(input:unknown){
  const envelope=parseBackupEnvelope(input);
  const revived:BackupEnvelope={...envelope,stores:reviveValue(envelope.stores) as BackupEnvelope['stores']};
  assertBackupRecordsValid(revived.stores);
  const candidates=collectBackupPuts(revived);
  const accepted:Array<{store:StoreName;item:{id:string}}>=[];
  for(const candidate of candidates){
    if(candidate.store==='profile'&&await getItem('profile',candidate.item.id))continue;
    if(candidate.store==='matches'){
      const existing=await getItem<{updatedAt?:number}>('matches',candidate.item.id);
      if(existing&&Number(existing.updatedAt||0)>Number((candidate.item as{updatedAt?:number}).updatedAt||0))continue;
    }
    accepted.push(candidate);
  }
  await putMany(accepted);
}
