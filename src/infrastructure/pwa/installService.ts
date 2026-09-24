type InstallPrompt = Event & { prompt:()=>Promise<void>; userChoice:Promise<{outcome:'accepted'|'dismissed'}> };
let deferred: InstallPrompt | null = null;
let listeners = new Set<()=>void>();
const DISMISSED='taamen-install-dismissed-v1';
const IOS_DISMISSED='taamen-ios-guidance-dismissed-v1';

export type InstallationState = 'installed' | 'installable' | 'ios-guidance' | 'unavailable';
export type InstallBannerMode = 'install' | 'ios' | 'hidden';

/** Which compact install surface to show. Installed, dismissed, and irrelevant stay hidden. */
export function installBannerMode(state: InstallationState, dismissedInstall: boolean, dismissedIos: boolean): InstallBannerMode {
  if (state === 'installed') return 'hidden';
  if (state === 'installable' && !dismissedInstall) return 'install';
  if (state === 'ios-guidance' && !dismissedIos) return 'ios';
  return 'hidden';
}

function emit(){listeners.forEach(fn=>fn());}
export const installService = {
  init(){
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e as InstallPrompt;emit();});
    window.addEventListener('appinstalled',()=>{deferred=null;localStorage.removeItem(DISMISSED);emit();});
  },
  subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)};},
  isInstalled(){return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone===true;},
  canPromptInstall(){return !!deferred && !this.isInstalled();},
  isDismissed(){return localStorage.getItem(DISMISSED)==='1';},
  dismiss(){localStorage.setItem(DISMISSED,'1');deferred=null;emit();},
  isIosDismissed(){return localStorage.getItem(IOS_DISMISSED)==='1';},
  dismissIosGuidance(){localStorage.setItem(IOS_DISMISSED,'1');emit();},
  bannerMode(){return installBannerMode(this.getInstallationState(), this.isDismissed(), this.isIosDismissed());},
  async promptInstall(){if(!deferred)return false;const p=deferred;await p.prompt();const choice=await p.userChoice;deferred=null;if(choice.outcome==='dismissed')localStorage.setItem(DISMISSED,'1');emit();return choice.outcome==='accepted';},
  getPlatform(){const ua=navigator.userAgent.toLowerCase();if(/iphone|ipad|ipod/.test(ua))return 'ios';if(/android/.test(ua))return 'android';return 'desktop';},
  getDisplayMode(){return this.isInstalled()?'standalone':'browser';},
  getInstallationState(){return this.isInstalled()?'installed':this.canPromptInstall()?'installable':this.getPlatform()==='ios'?'ios-guidance':'unavailable';},
};
