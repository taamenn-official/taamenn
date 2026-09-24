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
import { applyMotionPreference, prefersReducedMotion } from './motion/prefersReduced';
import { getItem } from './services/localDb';
import { analyticsEnabled, syncAhrefsAnalytics } from './services/analytics';
import { legalDocumentForPath } from './config/publicRoutes';
import LegalDocument from './pages/LegalDocument';
import PrivacyPolicyModal, { hasAcceptedConsent } from './components/PrivacyPolicyModal';
import { SideProjectorsBadge } from './components/SideProjectorsBadge';
import { installCopy, uiCopy } from './i18n/translations';
import { useDisplayMode } from './mobile/useDisplayMode';
import { RouteSkeleton } from './components/RouteSkeleton';
import { LanguageSwitch, ThemeToggle } from './components/ShellControls';
import { applyTheme, nextTheme, readTheme, type TaamenTheme } from './theme/theme';
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
 theme:TaamenTheme;
 onTheme:()=>void;
 onSession:(s:Session)=>void;
 onSignOut:()=>void;
 /** Lets App keep the ambient atmosphere in sync with the visible route. */
 onPage:(p:RouteId)=>void;
};

function RouteView({page,language,profile,go,onProfile,onReset,onLanguage,theme,onTheme,session,onSession,onSignOut,registerLeaveGuard}:ShellProps&{page:RouteId;go:(p:RouteId)=>void;registerLeaveGuard:(guard:(()=>boolean)|null)=>void}){
 const common={language};
 const scope=scopeFor(session);
 return <ErrorBoundary language={language} label={page}><Suspense fallback={<RouteSkeleton page={page}/>}>
  {page==='home'&&<Home {...common} profile={profile} go={go} session={session}/>} {page==='archive'&&scope==='normal'&&<Archive {...common}/>} {page==='match-center'&&scope==='normal'&&<Matches {...common}/>} {page==='historical-match-center'&&scope==='featured'&&<HistoricalMatchCenter {...common} onExitFeatured={onSignOut}/>} {page==='tactical'&&scope==='normal'&&<Tactical {...common}/>} {page==='stadiums'&&<Stadiums {...common}/>} {page==='profile'&&scope==='normal'&&<Profile language={language} profile={profile} onProfile={onProfile} session={session} registerLeaveGuard={registerLeaveGuard}/>} {page==='support'&&<Support language={language} profile={profile}/>} {page==='settings'&&<Settings language={language} profile={profile} onLanguage={onLanguage} theme={theme} onTheme={onTheme} onReset={onReset} onProfile={onProfile} session={session} onSession={onSession} onSignOut={onSignOut}/>}
 </Suspense></ErrorBoundary>;
}

function MainShell(props:ShellProps){
 const {language,profile,session,onLanguage,theme,onTheme,onPage}=props;
 const displayMode=useDisplayMode();
 const ar=language==='ar';const scope=scopeFor(session);
 const routes=useMemo(()=>routesForScope(scope),[scope]);const mobileRoutes=useMemo(()=>routesForMobileNav(scope),[scope]);const desktopSections=useMemo(()=>routesBySection(scope),[scope]);const desktopRoutes=useMemo(()=>routesForDesktopNav(scope),[scope]);const labels=routeRegistry.reduce((a,r)=>(a[r.id]=r.label[language],a),{} as Record<string,string>);const sectionLabels:{core:{ar:string;en:string};football:{ar:string;en:string};personal:{ar:string;en:string};system:{ar:string;en:string}}={core:{ar:'الأساسي',en:'Core'},football:{ar:'كرة القدم',en:'Football'},personal:{ar:'الشخصي',en:'Personal'},system:{ar:'النظام',en:'System'}}; const[unread,setUnread]=useState(0);const[page,setPage]=useState<RouteId>(()=>(location.hash.slice(1) as RouteId)||'home');const[notifications,setNotifications]=useState(false);
 const pageRef=useRef(page); pageRef.current=page;
 const sideNavRef=useRef<HTMLElement>(null);
 const bottomNavRef=useRef<HTMLElement>(null);
 const[bellPulse,setBellPulse]=useState(false);
 // Captured on the first render, before Home consumes the reveal flag.
 const navIntroDelay=useRef(0);
 const bellSkips=useRef(2);
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
 useEffect(()=>{
  let boundary=0;
  let wake=0;
  let stopped=false;
  const armBoundary=(delay:number|null)=>{
   window.clearTimeout(boundary);
   boundary=0;
   if(stopped||document.hidden||delay==null)return;
   boundary=window.setTimeout(()=>{void refresh()},delay);
  };
  const refresh=async()=>{
   if(stopped||document.hidden)return;
   const result=await reconcileMatchLifecycle();
   if(stopped)return;
   setUnread(await unreadCount());
   armBoundary(result.nextDelayMs);
  };
  const onWake=()=>{
   window.clearTimeout(wake);
   if(document.hidden){window.clearTimeout(boundary);boundary=0;return}
   wake=window.setTimeout(()=>{void refresh()},200);
  };
  void refresh();
  document.addEventListener('visibilitychange',onWake);
  window.addEventListener('focus',onWake);
  window.addEventListener('online',onWake);
  window.addEventListener('taamen-matches-changed',onWake);
  return()=>{
   stopped=true;
   window.clearTimeout(boundary);
   window.clearTimeout(wake);
   document.removeEventListener('visibilitychange',onWake);
   window.removeEventListener('focus',onWake);
   window.removeEventListener('online',onWake);
   window.removeEventListener('taamen-matches-changed',onWake);
  };
 },[]);
 const skipPageRefresh=useRef(true);
 useEffect(()=>{
  if(skipPageRefresh.current){skipPageRefresh.current=false;return}
  if(document.hidden)return;
  let active=true;
  unreadCount().then(count=>{if(active)setUnread(count)});
  return()=>{active=false};
 },[page]);
 useEffect(()=>{onPage(page)},[onPage,page]);
 // A single emphasis when new notifications arrive, never on the boot count.
 useEffect(()=>{
  const grew=unread>previousUnread.current;
  previousUnread.current=unread;
  if(bellSkips.current>0){bellSkips.current-=1;return}
  if(!grew||prefersReducedMotion())return;
  setBellPulse(true);
  const id=window.setTimeout(()=>setBellPulse(false),220);
  return()=>window.clearTimeout(id);
 },[unread]);
 useEffect(()=>{if(!routes.some(r=>r.id===page)){const fallback=scope==='featured'?'historical-match-center':'home';setPage(fallback);history.replaceState(null,'',`${location.pathname}#${fallback}`)}},[routes,page,scope]);
 useEffect(()=>{const onHash=()=>{const next=location.hash.slice(1) as RouteId;if(!routes.some(r=>r.id===next)){history.replaceState(null,'',`${location.pathname}#${pageRef.current}`);return}if(!requestRoute(next)){history.replaceState(null,'',`${location.pathname}#${pageRef.current}`);return;}setPage(next)};window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[routes]);
 const go=(p:RouteId)=>{if(!routes.some(r=>r.id===p))return;if(!requestRoute(p))return;setPage(p);history.replaceState(null,'',`${location.pathname}#${p}`);const compact=window.matchMedia('(max-width: 900px)').matches;window.scrollTo({top:0,behavior:compact||prefersReducedMotion()?'auto':'smooth'})};
 const identityCaption=scope==='featured'?'FEATURED':'LOCAL · TAAMEN';
 const navClass=desktopNav===null?'':desktopNav?'is-desktop-nav':'is-mobile-nav';
 return <div className={`app-shell ${navClass} is-${displayMode} ${scope==='featured'?'is-featured-shell':''}`}>
  <aside className={`sidebar ${sidebar?'':'is-collapsed'}`} hidden={desktopNav===false} aria-hidden={desktopNav===false} inert={desktopNav===false||undefined}>
   <div className={`brand-row ${sidebar?'':'is-collapsed'}`}>
     {sidebar && (
       <div className="brand-identity" onClick={()=>go('home')} role="button" tabIndex={0} title={labels.home}>
         <img className="brand-image" src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} width={32} height={32} decoding="async"/>
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
  <main className="main-content"><InstallBanner language={language}/><header className="topbar"><div className="mobile-brand"><img className="brand-image" src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} width={32} height={32} decoding="async"/><strong>TAAMEN 2.0</strong></div><div className="topbar-left">{!ar&&<DateTimeBlock language={language}/>}</div><div className="topbar-actions"><ConnectivityStatus language={language}/>{scope==='normal'&&<button className="avatar topbar-profile" onClick={()=>go('profile')} aria-label={labels.profile}>{profile.avatarData?<img src={profile.avatarData} alt=""/>:profile.firstName.slice(0,1)}</button>}<LanguageSwitch language={language} onLanguage={onLanguage}/><ThemeToggle theme={theme} onTheme={onTheme} language={language}/>{scope==='normal'&&<button className={`notification-button icon-button${bellPulse?' is-pulse':''}`} onClick={()=>setNotifications(true)} aria-label={ar?'الإشعارات':'Notifications'}><Bell size={18}/>{unread>0&&<i>{unread>99?'99+':unread}</i>}</button>}</div><div className="topbar-right">{ar&&<DateTimeBlock language={language}/>}</div></header>
   <SideProjectorsBadge language={language} variant="float"/>
   <PageStage page={page}><RouteView {...props} page={page} go={go} registerLeaveGuard={registerLeaveGuard}/></PageStage>
   <nav className="bottom-nav" ref={bottomNavRef} aria-label={ar?'تنقل الهاتف':'Mobile navigation'} hidden={desktopNav===true} aria-hidden={desktopNav===true} inert={desktopNav===true||undefined}><NavActiveIndicator navRef={bottomNavRef} activeKey={page} watch={[language,scope,desktopNav]} introDelay={navIntroDelay.current} className="is-bottom"/>{mobileRoutes.map(r=>{const Icon=r.icon;return <button type="button" className={`bottom-nav-item ${page===r.id?'is-active':''}`} data-route={r.id} key={r.id} aria-label={r.label[language]} aria-current={page===r.id?'page':undefined} onClick={()=>go(r.id)}><Icon size={18}/><span>{r.label[language]}</span></button>})}</nav>
   {/* Mounted only while open so overlay hooks and scroll-lock match other sheets. */}
   {notifications&&<NotificationCenter open={notifications} onClose={()=>setNotifications(false)} language={language} onChanged={()=>unreadCount().then(setUnread)}/>}
  </main>
 </div>;
}

export default function App(){
 const pathName=(window.location.pathname.replace(/\/+$/, '')||'/');
 const sharePath=pathName.match(/^\/share\/(match|profile)\/(.+)$/);
 const isAcquisition=pathName==='/acquisition';
 const legalDocument=legalDocumentForPath(pathName);
 const[language,setLanguage]=useState<Language>(()=>(localStorage.getItem('taamen-language') as Language)||'ar');
 const[theme,setTheme]=useState<TaamenTheme>(()=>readTheme());
 const[profile,setProfile]=useState<LocalProfile>();
 const[boot,setBoot]=useState(true);
 const[updateAvailable,setUpdateAvailable]=useState(false);
 const[updateDismissed,setUpdateDismissed]=useState(false);
 const[session,setSession]=useState<Session|null>(null);
 const[shellPage,setShellPage]=useState<RouteId>('home');
 const[needsConsent,setNeedsConsent]=useState(false);

 useEffect(()=>{installService.init();const onUpdate=()=>{setUpdateDismissed(false);setUpdateAvailable(true)};window.addEventListener('taamen-sw-update',onUpdate);return()=>window.removeEventListener('taamen-sw-update',onUpdate)},[]);
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';localStorage.setItem('taamen-language',language)},[language]);
 useEffect(()=>{applyTheme(theme)},[theme]);
 const toggleTheme=()=>setTheme(value=>nextTheme(value));
 // The Settings motion switch has to apply from boot, not only while Settings is open.
 useEffect(()=>{getItem<{motion?:boolean;analytics?:boolean}>('settings','privacy').then(v=>{applyMotionPreference(v?.motion!==false);syncAhrefsAnalytics(analyticsEnabled(v))}).catch(()=>{})},[]);
 useEffect(()=>{
  if(!profile)return;
  const run=()=>{void import('./pages/Archive');void import('./pages/Matches')};
  const idle=window.requestIdleCallback?.(run,{timeout:2000});
  if(typeof idle==='number')return()=>window.cancelIdleCallback(idle);
  const id=window.setTimeout(run,1500);
  return()=>window.clearTimeout(id);
 },[profile]);

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

 if(legalDocument)return <ErrorBoundary language={language} label={legalDocument}><LegalDocument language={language} onLanguage={toggle} documentId={legalDocument}/></ErrorBoundary>;
 if(isAcquisition)return <ErrorBoundary language={language} label="acquisition"><Suspense fallback={<div className="boot-screen"><img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT}/></div>}><Acquisition language={language} onLanguage={toggle} theme={theme} onTheme={toggleTheme}/></Suspense></ErrorBoundary>;
 if(sharePath)return <PublicSharePreview language={language} kind={sharePath[1] as 'match'|'profile'} token={decodeURIComponent(sharePath[2])}/>;
 if(boot)return <div className="boot-screen" role="status"><img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} width={70} height={70}/></div>;
 /* One persistent atmosphere host. Keeping it first in both branches means the
    profile setup screen hands over to Home without the background cutting. */
 const atmosphere=<TaamenAmbientBackground key="atmosphere" variant={profile?'home':'auth'} active={!profile||shellPage==='home'}/>;
 if(profile)return <>{atmosphere}<div className="update-banner" hidden={!updateAvailable||updateDismissed} role="status"><span>{installCopy[language].update}</span><button className="primary-action" onClick={()=>navigator.serviceWorker?.getRegistration().then(r=>r?.waiting?.postMessage({type:'SKIP_WAITING'})).then(()=>location.reload())}>{installCopy[language].updateAction}</button><button type="button" className="icon-button" onClick={()=>setUpdateDismissed(true)} aria-label={installCopy[language].dismissUpdate}>×</button></div><MainShell language={language} profile={profile} session={session} onProfile={setProfile} onReset={resetProfile} onLanguage={toggle} theme={theme} onTheme={toggleTheme} onSession={setSession} onSignOut={signOut} onPage={setShellPage}/>{needsConsent&&<PrivacyPolicyModal language={language} requireAccept onClose={()=>setNeedsConsent(false)}/>}</>;
 return <>{atmosphere}<ProfileSetup language={language} onLanguage={toggle} theme={theme} onTheme={toggleTheme} onSave={async p=>{const saved=await saveProfile(p);setProfile(saved)}}/></>;
}
