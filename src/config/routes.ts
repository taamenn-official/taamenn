import type { LucideIcon } from 'lucide-react';
import { Archive, Home as HomeIcon, Goal, LifeBuoy, Settings, UserRound, Swords, ClipboardList } from 'lucide-react';

export type Scope = 'normal'|'featured';
export type RouteId = 'home'|'archive'|'match-center'|'historical-match-center'|'tactical'|'profile'|'support'|'settings'|'stadiums';
export type RouteSection = 'core'|'football'|'personal'|'system';
export type RouteMeta={id:RouteId;icon:LucideIcon;label:{ar:string;en:string};scopes:Scope[];showInMobileNav:boolean;showInDesktopNav:boolean;section:RouteSection};
export const routeRegistry:RouteMeta[]=[
 {id:'home',icon:HomeIcon,label:{ar:'الرئيسية',en:'Home'},scopes:['normal','featured'],showInMobileNav:true,showInDesktopNav:true,section:'core'},
 {id:'archive',icon:Archive,label:{ar:'السجل',en:'Archive'},scopes:['normal'],showInMobileNav:true,showInDesktopNav:true,section:'football'},
 {id:'match-center',icon:ClipboardList,label:{ar:'مركز المباريات',en:'Match Center'},scopes:['normal'],showInMobileNav:true,showInDesktopNav:true,section:'football'},
 {id:'historical-match-center',icon:ClipboardList,label:{ar:'المباريات التاريخية',en:'Historical Matches'},scopes:['featured'],showInMobileNav:true,showInDesktopNav:true,section:'football'},
 {id:'tactical',icon:Swords,label:{ar:'الملعب التكتيكي',en:'Tactical Playground'},scopes:['normal'],showInMobileNav:false,showInDesktopNav:false,section:'football'},
 {id:'stadiums',icon:Goal,label:{ar:'الملاعب',en:'Stadiums'},scopes:['normal','featured'],showInMobileNav:true,showInDesktopNav:true,section:'football'},
 {id:'profile',icon:UserRound,label:{ar:'الملف الشخصي',en:'Profile'},scopes:['normal'],showInMobileNav:true,showInDesktopNav:true,section:'personal'},
 {id:'support',icon:LifeBuoy,label:{ar:'الدعم',en:'Support'},scopes:['normal','featured'],showInMobileNav:false,showInDesktopNav:true,section:'system'},
 {id:'settings',icon:Settings,label:{ar:'الإعدادات',en:'Settings'},scopes:['normal','featured'],showInMobileNav:true,showInDesktopNav:true,section:'system'},
];
export function routesForScope(scope:Scope){return routeRegistry.filter(r=>r.scopes.includes(scope))}
export function routesForMobileNav(scope:Scope){return routesForScope(scope).filter(r=>r.showInMobileNav)}
export function routesForDesktopNav(scope:Scope){return routesForScope(scope).filter(r=>r.showInDesktopNav)}
export function routesBySection(scope:Scope){const routes=routesForDesktopNav(scope);const sections:Record<RouteSection,typeof routes>={core:[],football:[],personal:[],system:[]};routes.forEach(r=>sections[r.section].push(r));return sections}
