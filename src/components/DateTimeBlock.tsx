import { useEffect, useState } from 'react';

export default function DateTimeBlock({language}:{language:'ar'|'en'}) {
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{
    const id=window.setInterval(()=>setNow(new Date()),1000);
    return ()=>window.clearInterval(id);
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
