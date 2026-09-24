import { useEffect, useState } from 'react';

export default function DateTimeBlock({language}:{language:'ar'|'en'}) {
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{
    const desktop=window.matchMedia('(min-width: 901px)');
    let id=0;
    const stop=()=>{window.clearInterval(id);id=0};
    const start=()=>{
      stop();
      if(!desktop.matches||document.hidden)return;
      setNow(new Date());
      id=window.setInterval(()=>setNow(new Date()),1000);
    };
    start();
    desktop.addEventListener('change',start);
    document.addEventListener('visibilitychange',start);
    return()=>{
      stop();
      desktop.removeEventListener('change',start);
      document.removeEventListener('visibilitychange',start);
    };
  },[]);
  const ar=language==='ar';
  const weekday=new Intl.DateTimeFormat(ar?'ar-PS':'en-US',{weekday:'long'}).format(now);
  const date=new Intl.DateTimeFormat(ar?'ar-PS-u-nu-latn':'en-GB',{day:'2-digit',month:'2-digit',year:'numeric',numberingSystem:'latn'}).format(now);
  const time=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
  return <div className="datetime-editorial" dir="ltr" aria-label={ar?'التاريخ والوقت المحلي':'Local date and time'}>
    <span className="datetime-weekday">{weekday}</span>
    <span className="datetime-date">{date}</span>
    <strong className="datetime-time">{time}</strong>
  </div>;
}
