import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Briefcase } from 'lucide-react';
import { ProfileSetup } from './components/ProfileSetup';
import { NotificationCenter } from './components/NotificationCenter';
import { getProfile, removeProfile, saveProfile, type LocalProfile } from './services/profileRepository';
import { unreadCount } from './services/notificationService';
import { reconcileMatchLifecycle } from './services/matchRepository';
import PublicSharePreview from './components/PublicSharePreview';
import { routeRegistry, routesForScope, routesForMobileNav, routesForDesktopNav, routesBySection, type RouteId, type Scope } from './config/routes';
import { api, type Session } from './services/apiClient';
import { TAAMEN_LOGO_ALT, TAAMEN_LOGO_SRC } from './config/branding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallBanner } from './shared/ui/InstallBanner';
import { ConnectivityStatus } from './shared/ui/ConnectivityStatus';
import { installService } from './infrastructure/pwa/installService';
import DateTimeBlock from './components/DateTimeBlock';
import TaamenAmbientBackground from './components/ui/taamen-ambient-background';
import PageStage from './motion/PageStage';
import NavActiveIndicator from './motion/NavActiveIndicator';
import { gsap, useGSAP } from './motion/gsapRuntime';
import { EASE, MOTION } from './motion/tokens';
import { applyMotionPreference, prefersReducedMotion } from './motion/prefersReduced';
import { getItem } from './services/localDb';
import { peekHomeReveal } from './motion/revealState';
import PrivacyPolicyModal, { hasAcceptedConsent } from './components/PrivacyPolicyModal';
import { SideProjectorsBadge } from './components/SideProjectorsBadge';
import { uiCopy } from './i18n/translations';
import './styles/global.css';
import './styles/taamen-ambient-background.css';

const Home=lazy(()=>import('./pages/Home')); const Archive=lazy(()=>import('./pages/Archive')); const Matches=lazy(()=>import('./pages/Matches')); const HistoricalMatchCenter=lazy(()=>import('./pages/HistoricalMatchCenter')); const Tactical=lazy(()=>import('./pages/Tactical')); const Stadiums=lazy(()=>import('./pages/Stadiums')); const Profile=lazy(()=>import('./components/Profile')); const Settings=lazy(()=>import('./pages/Settings')); const Support=lazy(()=>import('./pages/Support')); const Acquisition=lazy(()=>import('./pages/Acquisition'));
type Language='ar'|'en';

/**
 * Recognition (`code`) sessions switch the shell into the read-only historical
 * experience. Ordinary use stays local-first with no account.
 */
function scopeFor(session:Session|null):Scope{return session?.authMethod==='code'?'featured':'normal'}

type ShellProps={
 language:Language;
 profile:LocalProfile;
 session:Session|null;
 onProfile:(p:LocalProfile)=>void;
 onReset:()=>void;
 onLanguage:()=>void;
 onSession:(s:Session)=>void;
 onSignOut:()=>void;
 /** Lets App keep the ambient atmosphere in sync with the visible route. */
 onPage:(p:RouteId)=>void;
};

function RouteView({page,language,profile,go,onProfile,onReset,onLanguage,session,onSession,onSignOut,registerLeaveGuard}:ShellProps&{page:RouteId;go:(p:RouteId)=>void;registerLeaveGuard:(guard:(()=>boolean)|null)=>void}){
 const common={language};
 const scope=scopeFor(session);
 return <ErrorBoundary language={language} label={page}><Suspense fallback={<div className="loading-screen"><img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT}/><span>TAAMEN 2.0</span></div>}>
  {page==='home'&&<Home {...common} profile={profile} go={go} session={session}/>} {page==='archive'&&scope==='normal'&&<Archive {...common}/>} {page==='match-center'&&scope==='normal'&&<Matches {...common}/>} {page==='historical-match-center'&&scope==='featured'&&<HistoricalMatchCenter {...common} onExitFeatured={onSignOut}/>} {page==='tactical'&&scope==='normal'&&<Tactical {...common}/>} {page==='stadiums'&&<Stadiums {...common}/>} {page==='profile'&&scope==='normal'&&<Profile language={language} profile={profile} onProfile={onProfile} session={session} registerLeaveGuard={registerLeaveGuard}/>} {page==='support'&&<Support language={language} profile={profile}/>} {page==='settings'&&<Settings language={language} profile={profile} onLanguage={onLanguage} onReset={onReset} onProfile={onProfile} session={session} onSession={onSession} onSignOut={onSignOut}/>}
 </Suspense></ErrorBoundary>;
}

function MainShell(props:ShellProps){
 const {language,profile,session,onLanguage,onPage}=props;
 const ar=language==='ar';const scope=scopeFor(session);
 const routes=useMemo(()=>routesForScope(scope),[scope]);const mobileRoutes=useMemo(()=>routesForMobileNav(scope),[scope]);const desktopSections=useMemo(()=>routesBySection(scope),[scope]);const desktopRoutes=useMemo(()=>routesForDesktopNav(scope),[scope]);const labels=routeRegistry.reduce((a,r)=>(a[r.id]=r.label[language],a),{} as Record<string,string>);const sectionLabels:{core:{ar:string;en:string};football:{ar:string;en:string};personal:{ar:string;en:string};system:{ar:string;en:string}}={core:{ar:'الأساسي',en:'Core'},football:{ar:'كرة القدم',en:'Football'},personal:{ar:'الشخصي',en:'Personal'},system:{ar:'النظام',en:'System'}}; const[unread,setUnread]=useState(0);const[page,setPage]=useState<RouteId>(()=>(location.hash.slice(1) as RouteId)||'home');const[notifications,setNotifications]=useState(false);
 const pageRef=useRef(page); pageRef.current=page;
 const sideNavRef=useRef<HTMLElement>(null);
 const bottomNavRef=useRef<HTMLElement>(null);
 const bellRef=useRef<HTMLButtonElement>(null);
 // Captured on the first render, before Home consumes the reveal flag.
 const navIntroDelay=useRef(peekHomeReveal()==='cinematic'?0.85:0.2);
 const unreadSettled=useRef(false);
 const previousUnread=useRef(0);
 const leaveGuardRef=useRef<(()=>boolean)|null>(null);
 const registerLeaveGuard=useCallback((guard:(()=>boolean)|null)=>{leaveGuardRef.current=guard},[]);
 const requestRoute=(next:RouteId)=>{
  if(next===pageRef.current) return true;
  return leaveGuardRef.current?.() ?? true;
 };
 const[sidebar,setSidebar]=useState<boolean>(()=>{
   const saved=localStorage.getItem('taamen-sidebar-collapsed');
   return saved!==null?saved!=='true':true;
 });
 const[desktopNav,setDesktopNav]=useState<boolean|null>(null);
 useEffect(()=>{
  const mq=window.matchMedia('(min-width: 901px)');
  const sync=()=>setDesktopNav(mq.matches);
  sync();
  mq.addEventListener('change',sync);
  return()=>mq.removeEventListener('change',sync);
 },[]);
 const toggleSidebar=()=>{
   setSidebar(x=>{
     const next=!x;
     localStorage.setItem('taamen-sidebar-collapsed',String(!next));
     return next;
   });
 };
 useEffect(()=>{const refresh=async()=>{await reconcileMatchLifecycle();setUnread(await unreadCount())};refresh();const id=window.setInterval(refresh,15000);return()=>clearInterval(id)},[]);
 useEffect(()=>{onPage(page)},[onPage,page]);
 // A single emphasis when new notifications arrive, never on the first count.
 useGSAP(()=>{
  const el=bellRef.current;const grew=unread>previousUnread.current;
  previousUnread.current=unread;
  if(!unreadSettled.current){unreadSettled.current=true;return}
  if(!el||!grew||prefersReducedMotion())return;
  gsap.fromTo(el,{scale:1},{scale:1.14,duration:MOTION.fast,ease:EASE.hover,yoyo:true,repeat:1,clearProps:'transform'});
 },{dependencies:[unread]});
 useEffect(()=>{if(!routes.some(r=>r.id===page)){const fallback=scope==='featured'?'historical-match-center':'home';setPage(fallback);history.replaceState(null,'',`${location.pathname}#${fallback}`)}},[routes,page,scope]);
 useEffect(()=>{const onHash=()=>{const next=location.hash.slice(1) as RouteId;if(!routes.some(r=>r.id===next)){history.replaceState(null,'',`${location.pathname}#${pageRef.current}`);return}if(!requestRoute(next)){history.replaceState(null,'',`${location.pathname}#${pageRef.current}`);return;}setPage(next)};window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[routes]);
 const go=(p:RouteId)=>{if(!routes.some(r=>r.id===p))return;if(!requestRoute(p))return;setPage(p);history.replaceState(null,'',`${location.pathname}#${p}`);window.scrollTo({top:0,behavior:'smooth'})};
 const identityCaption=scope==='featured'?'FEATURED':'LOCAL · TAAMEN';
 const navClass=desktopNav===null?'':desktopNav?'is-desktop-nav':'is-mobile-nav';
 return <div className={`app-shell ${navClass} ${scope==='featured'?'is-featured-shell':''}`}>
  <aside className={`sidebar ${sidebar?'':'is-collapsed'}`} hidden={desktopNav===false} aria-hidden={desktopNav===false} inert={desktopNav===false||undefined}>
   <div className={`brand-row ${sidebar?'':'is-collapsed'}`}>
     {sidebar && (
       <div className="brand-identity" onClick={()=>go('home')} role="button" tabIndex={0} title={labels.home}>
         <img className="brand-image" src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT}/>
         <span className="brand-name">TAAMEN 2.0</span>
       </div>
     )}
     <button
       type="button"
       className={`hamburger-toggle ${sidebar?'is-expanded':'is-collapsed'}`}
       onClick={toggleSidebar}
       aria-expanded={sidebar}
       aria-label={sidebar?(ar?'طي الشريط الجانبي':'Collapse navigation'):(ar?'توسيع القائمة':'Expand navigation')}
       title={sidebar?(ar?'طي الشريط الجانبي':'Collapse navigation'):(ar?'توسيع القائمة':'Expand navigation')}
     >
       <span className="hamburger-box">
         <span className="hamburger-line line-1"/>
         <span className="hamburger-line line-2"/>
         <span className="hamburger-line line-3"/>
       </span>
     </button>
   </div>
   <nav className="side-nav" ref={sideNavRef} aria-label={ar?'التنقل الرئيسي':'Primary navigation'}><NavActiveIndicator navRef={sideNavRef} activeKey={page} watch={[sidebar,language,scope,desktopNav]} introDelay={navIntroDelay.current}/>{sidebar?Object.entries(desktopSections).map(([sectionKey,sectionRoutes])=>sectionRoutes.length>0?<div key={sectionKey} className="nav-section"><span className="nav-section-label">{sectionLabels[sectionKey as keyof typeof sectionLabels][language]}</span>{sectionRoutes.map(r=>{const Icon=r.icon;return <button key={r.id} className={`nav-item ${page===r.id?'is-active':''}`} data-route={r.id} onClick={()=>go(r.id)} aria-current={page===r.id?'page':undefined}><Icon size={18}/><span>{labels[r.id]}</span></button>})}</div>:null):desktopRoutes.map(r=>{const Icon=r.icon;return <button key={r.id} className={`nav-item ${page===r.id?'is-active':''}`} data-route={r.id} onClick={()=>go(r.id)} aria-current={page===r.id?'page':undefined}><Icon size={18}/><span className="tooltip">{labels[r.id]}</span></button>})}</nav>
   <a className="nav-item acquisition-nav" href="/acquisition" aria-label={uiCopy[language].acquisitionNav}><Briefcase size={18} aria-hidden="true"/>{sidebar?<span>{uiCopy[language].acquisitionNav}</span>:<span className="tooltip">{uiCopy[language].acquisitionNav}</span>}</a>
  {scope==='normal'&&<div className="sidebar-footer"><button className="avatar avatar-button" title={labels.profile} onClick={()=>go('profile')}>{profile.avatarData?<img src={profile.avatarData} alt=""/>:profile.firstName.slice(0,1)}</button>{sidebar&&<div className="user-caption"><strong>{profile.firstName} {profile.lastName}</strong><span>{identityCaption}</span></div>}</div>}
  </aside>
  <main className="main-content"><InstallBanner language={language}/><header className="topbar"><div className="mobile-brand"><img className="brand-image" src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT}/><strong>TAAMEN 2.0</strong></div><div className="topbar-left">{!ar&&<DateTimeBlock language={language}/>}</div><div className="topbar-actions"><ConnectivityStatus language={language}/>{scope==='normal'&&<button className="avatar topbar-profile" onClick={()=>go('profile')} aria-label={labels.profile}>{profile.avatarData?<img src={profile.avatarData} alt=""/>:profile.firstName.slice(0,1)}</button>}<button className="language-button" onClick={onLanguage}>{ar?'English':'العربية'}</button>{scope==='normal'&&<button ref={bellRef} className="notification-button icon-button" onClick={()=>setNotifications(true)} aria-label={ar?'الإشعارات':'Notifications'}><Bell size={18}/>{unread>0&&<i>{unread>99?'99+':unread}</i>}</button>}</div><div className="topbar-right">{ar&&<DateTimeBlock language={language}/>}</div></header>
   <SideProjectorsBadge language={language} variant="float"/>
   <PageStage page={page}><RouteView {...props} page={page} go={go} registerLeaveGuard={registerLeaveGuard}/></PageStage>
   <nav className="bottom-nav" ref={bottomNavRef} aria-label={ar?'تنقل الهاتف':'Mobile navigation'} hidden={desktopNav===true} aria-hidden={desktopNav===true} inert={desktopNav===true||undefined}><NavActiveIndicator navRef={bottomNavRef} activeKey={page} watch={[language,scope,desktopNav]} introDelay={navIntroDelay.current} className="is-bottom"/>{mobileRoutes.map(r=>{const Icon=r.icon;return <button type="button" className={`bottom-nav-item ${page===r.id?'is-active':''}`} data-route={r.id} key={r.id} aria-label={r.label[language]} onClick={()=>go(r.id)}><Icon size={18}/><span>{r.label[language]}</span></button>})}</nav>
   {/* Mounted only while open so overlay hooks and scroll-lock match other sheets. */}
   {notifications&&<NotificationCenter open={notifications} onClose={()=>setNotifications(false)} language={language} onChanged={()=>unreadCount().then(setUnread)}/>}
  </main>
 </div>;
}

export default function App(){
 const pathName=(window.location.pathname.replace(/\/+$/, '')||'/');
 const sharePath=pathName.match(/^\/share\/(match|profile)\/(.+)$/);
 const isAcquisition=pathName==='/acquisition';
 const[language,setLanguage]=useState<Language>(()=>(localStorage.getItem('taamen-language') as Language)||'ar');
 const[profile,setProfile]=useState<LocalProfile>();
 const[boot,setBoot]=useState(true);
 const[updateAvailable,setUpdateAvailable]=useState(false);
 const[session,setSession]=useState<Session|null>(null);
 const[shellPage,setShellPage]=useState<RouteId>('home');
 const[needsConsent,setNeedsConsent]=useState(false);

 useEffect(()=>{installService.init();const onUpdate=()=>setUpdateAvailable(true);window.addEventListener('taamen-sw-update',onUpdate);return()=>window.removeEventListener('taamen-sw-update',onUpdate)},[]);
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';localStorage.setItem('taamen-language',language)},[language]);
 // The Settings motion switch has to apply from boot, not only while Settings is open.
 useEffect(()=>{getItem<{motion?:boolean}>('settings','privacy').then(v=>applyMotionPreference(v?.motion!==false)).catch(()=>{})},[]);

 // The server owns session state. Local storage never records who is signed in.
 useEffect(()=>{
  let active=true;
  Promise.all([getProfile(),api.session().catch(()=>null)]).then(([storedProfile,serverSession])=>{
   if(!active)return;
   setProfile(storedProfile);
   setSession(serverSession);
   setNeedsConsent(Boolean(storedProfile)&&!hasAcceptedConsent());
   setBoot(false);
  });
  return()=>{active=false};
 },[]);

 const toggle=()=>setLanguage(x=>x==='ar'?'en':'ar');

 const signOut=useCallback(async()=>{
  try{await api.logout()}catch{/* the local session is dropped regardless */}
  setSession(null);
 },[]);

 /** Reset clears local TAAMEN data and ends any server session. */
 const resetProfile=useCallback(async()=>{
  await removeProfile();
  try{await api.logout()}catch{/* nothing to end */}
  setSession(null);
  setProfile(undefined);
  setLanguage('ar');
 },[]);

 if(isAcquisition)return <ErrorBoundary language={language} label="acquisition"><Suspense fallback={<div className="loading-screen"><img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT}/><span>TAAMEN 2.0</span></div>}><Acquisition language={language} onLanguage={toggle}/></Suspense></ErrorBoundary>;
 if(sharePath)return <PublicSharePreview language={language} kind={sharePath[1] as 'match'|'profile'} token={decodeURIComponent(sharePath[2])}/>;
 if(boot)return <div className="loading-screen"><img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT}/><span>TAAMEN 2.0</span></div>;
 /* One persistent atmosphere host. Keeping it first in both branches means the
    profile setup screen hands over to Home without the background cutting. */
 const atmosphere=<TaamenAmbientBackground key="atmosphere" variant={profile?'home':'auth'} active={!profile||shellPage==='home'}/>;
 if(profile)return <>{atmosphere}<div className="update-banner" hidden={!updateAvailable}><span>{language==='ar'?'يتوفر تحديث جديد لـ TAAMEN.':'A new TAAMEN update is available.'}</span><button className="primary-action" onClick={()=>navigator.serviceWorker?.getRegistration().then(r=>r?.waiting?.postMessage({type:'SKIP_WAITING'})).then(()=>location.reload())}>{language==='ar'?'تحديث':'Update'}</button></div><MainShell language={language} profile={profile} session={session} onProfile={setProfile} onReset={resetProfile} onLanguage={toggle} onSession={setSession} onSignOut={signOut} onPage={setShellPage}/>{needsConsent&&<PrivacyPolicyModal language={language} requireAccept onClose={()=>setNeedsConsent(false)}/>}</>;
 return <>{atmosphere}<ProfileSetup language={language} onLanguage={toggle} onSave={async p=>{const saved=await saveProfile(p);setProfile(saved)}}/></>;
}
