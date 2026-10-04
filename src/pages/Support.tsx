import { useMemo, useRef, useState } from 'react';
import { AtSign, Check, ChevronDown, Mail, MessageCircle, Radio, Send, X } from 'lucide-react';
import { INSTAGRAM_URL, WHATSAPP_CHANNEL_URL, WHATSAPP_URL } from '../config/support';
import { api, ApiError, type ContactResult } from '../services/apiClient';
import { uiCopy } from '../i18n/translations';
import { useFormEntrance } from '../motion/useFormEntrance';
import { gsap } from '../motion/gsapRuntime';
import { EASE, MOTION } from '../motion/tokens';
import { prefersReducedMotion } from '../motion/prefersReduced';

/**
 * The single contact surface in TAAMEN.
 *
 * Messages are posted to the TAAMEN backend. The recipient is chosen by the
 * server-side EmailJS configuration, never by this form.
 */
export default function Support({language,profile,onBack}:{language:'ar'|'en';profile:{firstName:string;email?:string};onBack?:()=>void}){
  const ar=language==='ar';
  const copy=uiCopy[language];
  const pageRef=useFormEntrance<HTMLElement>();
  const statusRef=useRef<HTMLDivElement>(null);
  const lastSent=useRef('');
  const inFlight=useRef(false);
  const profileEmail=profile.email?.trim()||'';
  const hasProfileEmail=profileEmail.includes('@');
  const [email,setEmail]=useState(hasProfileEmail?profileEmail:'');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [failed,setFailed]=useState(false);
  const [sent,setSent]=useState(false);
  const [formOpen,setFormOpen]=useState(false);

  const replyEmail=useMemo(()=>hasProfileEmail?profileEmail:email.trim(),[hasProfileEmail,profileEmail,email]);

  const celebrateSuccess=()=>{
    const el=statusRef.current;
    if(!el||prefersReducedMotion())return;
    gsap.fromTo(el,{opacity:0.35},{opacity:1,duration:MOTION.ui,ease:EASE.entrance});
  };

  const submit=async(event?:{preventDefault():void})=>{
    event?.preventDefault();
    if(inFlight.current||busy)return;
    const trimmed=message.trim();
    if(!replyEmail.includes('@')||trimmed.length<3){
      setFailed(true);
      setSent(false);
      setStatus(copy.contactInvalid);
      return;
    }
    const fingerprint=`${replyEmail.toLowerCase()}\n${trimmed}`;
    if(fingerprint===lastSent.current){
      setFailed(false);
      setSent(true);
      setStatus(copy.contactDuplicate);
      return;
    }
    inFlight.current=true;
    setBusy(true);setStatus(copy.contactSending);setFailed(false);setSent(false);
    try{
      const result:ContactResult=await api.sendContactMessage({
        email:replyEmail,
        message:trimmed,
        name:profile.firstName,
      });
      if(!result.contactSent){
        throw new ApiError(502, 'The message could not be delivered.');
      }
      lastSent.current=fingerprint;
      setSent(true);
      setStatus(result.autoReplySent===false ? copy.contactPartial : copy.contactSent);
      queueMicrotask(celebrateSuccess);
    }catch(error){
      setFailed(true);
      setSent(false);
      const statusCode=error instanceof ApiError ? error.status : -1;
      if(statusCode===0)setStatus(copy.contactOffline);
      else if(statusCode===400)setStatus(copy.contactInvalid);
      else if(statusCode===429)setStatus(copy.contactRateLimited);
      else if(statusCode===503)setStatus(copy.contactUnconfigured);
      else if(statusCode>=500)setStatus(copy.contactEmailUnavailable);
      else setStatus(copy.contactFailed);
    }finally{
      inFlight.current=false;
      setBusy(false);
    }
  };

  return <section className="page-content support-page" ref={pageRef}>
    <div className="page-heading"><div><p className="eyebrow">TAAMEN 2.0 / SUPPORT</p><h1>{ar?'الدعم':'Support'}</h1><p className="subtitle">{ar?'طرق مباشرة للوصول إلى دعم TAAMEN.':'Direct ways to reach TAAMEN support.'}</p></div>{onBack&&<button className="dark-action" onClick={onBack}><X size={15}/>{copy.closeViewer}</button>}</div>
    {status&&<div ref={statusRef} className={`${failed?'error-banner':sent?'success-banner contact-sent':'contact-status'}`} role={failed?'alert':'status'} aria-live="polite">{status}</div>}
    <div className="contact-actions" role="group" aria-label={ar ? 'طرق التواصل' : 'Contact actions'}>
      <a className="contact-action" href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener">
        <span className="contact-action-icon" aria-hidden="true"><AtSign size={18} /></span>
        <span className="contact-action-copy"><strong>{copy.officialInstagramAction}</strong><small>{copy.officialHandle}</small></span>
      </a>
      {WHATSAPP_URL && <a className="contact-action" href={WHATSAPP_URL} target="_blank" rel="noreferrer noopener">
        <span className="contact-action-icon" aria-hidden="true"><MessageCircle size={18} /></span>
        <span className="contact-action-copy"><strong>{copy.officialWhatsAppAction}</strong><small>{copy.openWhatsApp}</small></span>
      </a>}
      <a className="contact-action" href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noreferrer noopener">
        <span className="contact-action-icon" aria-hidden="true"><Radio size={18} /></span>
        <span className="contact-action-copy"><strong>{copy.officialChannelAction}</strong><small>{copy.openWhatsAppChannel}</small></span>
      </a>
    </div>
    <div className="content-grid support-grid official-contact-grid">
      <section className="panel support-card support-contact">
        <button type="button" className="support-disclosure" aria-expanded={formOpen} aria-controls="support-message-panel" onClick={()=>setFormOpen(open=>!open)}>
          <Mail size={18} aria-hidden="true"/>
          <span>{copy.supportAsk}</span>
          <ChevronDown size={16} aria-hidden="true" className={formOpen?'is-open':''}/>
        </button>
        {formOpen&&<div id="support-message-panel" className="support-message-panel">
        <div className="support-guide">
          <p>{copy.supportGuideLead}</p>
          <ol>
            <li>{copy.supportStepPage}</li>
            <li>{copy.supportStepTrying}</li>
            <li>{copy.supportStepHappened}</li>
            <li>{copy.supportStepSend}</li>
          </ol>
          <div className="support-example"><strong>{copy.supportExampleTitle}</strong><p>{copy.supportExampleBody}</p></div>
        </div>
        <form className="support-contact-form" onSubmit={submit} noValidate>
          {hasProfileEmail
            ? <p className="settings-note">{copy.contactUsingProfileEmail} <strong>{profileEmail}</strong></p>
            : <label>{copy.contactEmailLabel}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" maxLength={254} autoComplete="email" disabled={busy}/></label>}
          <label>{copy.contactMessageLabel}<textarea rows={6} value={message} onChange={e=>setMessage(e.target.value)} placeholder={copy.contactMessagePlaceholder} maxLength={2000} disabled={busy}/></label>
          <button className={`primary-action${sent&&!failed?' is-sent':''}`} type="submit" disabled={busy|| (sent&&!failed)} aria-busy={busy}>
            {sent&&!failed?<Check size={15}/>:<Send size={15}/>}
            {busy?copy.contactSending:sent&&!failed?copy.contactSentAction:failed?copy.contactRetry:copy.contactSend}
          </button>
        </form>
        </div>}
      </section>
    </div>
  </section>;
}
