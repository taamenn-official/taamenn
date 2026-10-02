import { useEffect, useState } from 'react';
import {
  Archive, ArrowLeft, ArrowRight, Bell, BookOpen, ClipboardList, Home, Landmark,
  LifeBuoy, Settings, Share2, UserRound, X, type LucideIcon,
} from 'lucide-react';
import type { Language } from '../i18n/translations';
import '../styles/usage-guide.css';

type Copy = { ar: string; en: string };

interface GuideSection {
  id: string;
  icon: LucideIcon;
  title: Copy;
  purpose: Copy;
  what: Copy;
  steps: { ar: string[]; en: string[] };
  example: Copy;
  tip?: Copy;
}

const sections: GuideSection[] = [
  {
    id: 'welcome',
    icon: BookOpen,
    title: { ar: 'ما هو TAAMEN؟', en: 'What is TAAMEN?' },
    purpose: { ar: 'مساحة عمل للمباراة على هذا الجهاز.', en: 'A match workspace on this device.' },
    what: {
      ar: 'TAAMEN ينظّم مباريات كرة القدم وكرة الصالات: الموعد، الملعب، النتيجة، والسجل. الملف والبيانات تبقى على جهازك ما لم تختر مشاركتها.',
      en: 'TAAMEN organizes football and futsal matches: kickoff, venue, result, and history. Your profile and data stay on this device unless you choose to share them.',
    },
    steps: {
      ar: ['فكّر في TAAMEN كمساحة رقمية لفريقك.', 'الرئيسية تلخّص ما هو قريب.', 'مركز المباريات والسجل والملاعب والملف والإعدادات والدعم هي الوجهات اليومية.'],
      en: ['Think of TAAMEN as your team’s digital match workspace.', 'Home summarizes what is nearby.', 'Match Center, Archive, Stadiums, Profile, Settings, and Support are the daily destinations.'],
    },
    example: {
      ar: 'قبل مباراة الجمعة تفتح الرئيسية، تتأكد من الموعد والملعب، ثم تشارك التفاصيل مع الزملاء.',
      en: 'Before Friday’s match you open Home, confirm the time and venue, then share the details with teammates.',
    },
  },
  {
    id: 'start',
    icon: UserRound,
    title: { ar: 'البداية', en: 'Getting started' },
    purpose: { ar: 'ملف محلي، بلا حساب سحابي.', en: 'A local profile, not a cloud account.' },
    what: {
      ar: 'الاسم الأول مطلوب. اسم العائلة والبريد والهاتف والصورة اختيارية. الموافقة على الخصوصية مطلوبة للمتابعة. بعدها تفتح الرئيسية.',
      en: 'First name is required. Family name, email, phone, and photo are optional. Privacy consent is required to continue. Home opens after that.',
    },
    steps: {
      ar: ['اكتب الاسم الأول.', 'أضف البريد فقط إذا أردت أن تُستخدم رسائل الدعم منه.', 'وافق على الخصوصية ثم تابع.', 'من الرئيسية راجع البطاقات وأحدث المباريات.'],
      en: ['Enter your first name.', 'Add email only if Support should use it.', 'Accept privacy, then continue.', 'On Home, review the cards and the latest matches.'],
    },
    example: {
      ar: 'يوسف ينشئ ملفًا باسمه فقط. لاحقًا يضيف صورة من الملف الشخصي عندما يريد مشاركة نسخة عامة.',
      en: 'Yousef creates a profile with only his first name. Later he adds a photo from Profile when he wants a public share.',
    },
    tip: { ar: 'البريد والهاتف لا يظهران في المشاركة العامة.', en: 'Email and phone never appear in a public share.' },
  },
  {
    id: 'home',
    icon: Home,
    title: { ar: 'الرئيسية', en: 'Home' },
    purpose: { ar: 'ملخص سريع، لا لوحة تحكم معقّدة.', en: 'A short summary, not a dense dashboard.' },
    what: {
      ar: 'ترى ترحيبًا، وعدد السجلات والمواجهات الحاسمة والتعادلات، واختصارًا للملاعب، ثم أحدث المباريات المسجّلة.',
      en: 'You see a greeting, counts for the archive, decided matches, and draws, a shortcut to stadiums, then the latest recorded matches.',
    },
    steps: {
      ar: ['اقرأ الترحيب لتتأكد أنك في ملفك.', 'اضغط بطاقة السجل أو الملاعب للانتقال.', 'من «أحدث المواجهات» افتح مباراة أو اعرض الكل.'],
      en: ['Read the greeting to confirm this is your profile.', 'Open the archive or stadiums card to jump there.', 'From Latest matches, open one match or view all.'],
    },
    example: {
      ar: 'قبل المباراة: الرئيسية ← تأكيد أن السجل محدّث ← الملاعب للتأكد من المكان ← مركز المباريات للتفاصيل.',
      en: 'Before kickoff: Home, confirm the archive looks current, check Stadiums for the place, then open Match Center for the details.',
    },
  },
  {
    id: 'matches',
    icon: ClipboardList,
    title: { ar: 'مركز المباريات', en: 'Match Center' },
    purpose: { ar: 'إنشاء المباراة ومتابعتها حتى تُسجَّل.', en: 'Create a match and follow it until the result is recorded.' },
    what: {
      ar: 'المباراة تحمل الفريقين والموعد والملعب والنوع. تمر بحالات: قادمة، نشطة، انتهت والنتيجة معلّقة، ثم النتيجة مسجّلة. المشاركة متاحة عندما تسمح إعدادات المباراة.',
      en: 'A match holds both teams, kickoff, stadium, and type. It moves through upcoming, active, finished with the result still pending, then result recorded. Sharing is available when the match allows it.',
    },
    steps: {
      ar: ['أنشئ مباراة بالفريقين والموعد والملعب.', 'قبل الانطلاق راجع الوقت والمكان.', 'عند الانتهاء أدخل النتيجة.', 'بعدها تظهر في السجل كنتيجة مسجّلة.'],
      en: ['Create a match with both teams, kickoff, and stadium.', 'Before kickoff, review the time and place.', 'When it ends, enter the result.', 'It then belongs in the archive as a recorded result.'],
    },
    example: {
      ar: 'الجمعة 20:00، الفريق أ ضد الفريق ب، في ملعب محفوظ. قبل المباراة تراجع التفاصيل وتشاركها. بعدها تدخل النتيجة حتى لا تبقى معلّقة.',
      en: 'Friday 20:00, Team A versus Team B, at a saved stadium. Before kickoff you review and share the details. Afterward you enter the score so it does not stay pending.',
    },
    tip: { ar: 'النتيجة المعلّقة ليست ضياعًا للمباراة. هي تذكير بإدخال الرقم النهائي.', en: 'A pending result is not a lost match. It is a reminder to enter the final score.' },
  },
  {
    id: 'archive',
    icon: Archive,
    title: { ar: 'السجل', en: 'Archive' },
    purpose: { ar: 'المباريات المكتملة في مكان واحد.', en: 'Completed matches in one place.' },
    what: {
      ar: 'السجل يعرض ما أنشأته أو استوردته على هذا الجهاز. البحث بالفريق أو الملعب، والتصفية بالنوع. قسم «انتهت — النتيجة معلّقة» يُغلق إذا لم يوجد شيء، ويفتح إذا بقيت نتيجة بلا إدخال.',
      en: 'Archive shows matches you created or imported on this device. Search by team or stadium, and filter by type. “Finished — result pending” stays closed when nothing is waiting, and opens when a score still needs to be entered.',
    },
    steps: {
      ar: ['ابحث عن الفريق أو الملعب.', 'إذا ظهر عدّاد في قسم النتيجة المعلّقة، افتحه.', 'اضغط «إدخال النتيجة» وسجّل الرقمين.', 'بعد الحفظ تنتقل المباراة إلى النتائج المسجّلة.'],
      en: ['Search for the team or stadium.', 'If the pending-result section shows a count, open it.', 'Choose Enter result and record both scores.', 'After saving, the match moves to recorded results.'],
    },
    example: {
      ar: 'مباراة الجمعة انتهت ولم تُكتب النتيجة. السجل يُبقيها ظاهرة في «النتيجة معلّقة» حتى تدخل 2–1، ثم تجدها مع النتائج المسجّلة.',
      en: 'Friday’s match ended without a score. Archive keeps it under Finished — result pending until you enter 2–1, then you find it with the recorded results.',
    },
    tip: { ar: 'إذا أغلقت القسم بنفسك يبقى مغلقًا في هذه الزيارة.', en: 'If you close that section yourself, it stays closed for this visit.' },
  },
  {
    id: 'stadiums',
    icon: Landmark,
    title: { ar: 'الملاعب', en: 'Stadiums' },
    purpose: { ar: 'أماكن اللعب المعروفة، بلا إعادة كتابة كل مرة.', en: 'Known places to play, without retyping them.' },
    what: {
      ar: 'قائمة ملاعب بأسماء ومدن. عند التوسيع ترى العنوان والوصف ورقم التواصل إن وُجد، ويمكن فتح واتساب لصاحب الملعب. إذا لم تجد ملعبك، صفحة الدعم هي طريق الإضافة.',
      en: 'A list of stadiums with names and cities. Expand one to see the address, description, and phone when they exist, and open WhatsApp for that venue. If your place is missing, Support is how you ask for it.',
    },
    steps: {
      ar: ['ابحث بالمدينة أو اسم الملعب.', 'وسّع البطاقة لقراءة المكان.', 'استخدم الاسم نفسه عند إنشاء المباراة.', 'إن غاب الملعب، اكتب للدعم باسمه وعنوانه.'],
      en: ['Search by city or stadium name.', 'Expand the card to read the place.', 'Use that same name when you create the match.', 'If the venue is missing, tell Support its name and address.'],
    },
    example: {
      ar: 'تلعب عادة في ملعبين في الخليل. قبل إنشاء مباراة الجمعة تبحث عن الملعب، تتأكد من العنوان، ثم تكتبه في مركز المباريات.',
      en: 'You usually play at two places in Hebron. Before creating Friday’s match you search the stadium, confirm the address, then enter it in Match Center.',
    },
  },
  {
    id: 'profile',
    icon: UserRound,
    title: { ar: 'الملف الشخصي', en: 'Profile' },
    purpose: { ar: 'هويتك المحلية داخل TAAMEN.', en: 'Your local identity inside TAAMEN.' },
    what: {
      ar: 'الاسم والصورة والغلاف. الحفظ ينشط عند وجود تغيير. قص الصورة يُبقي الإطار ثابتًا وتحرك الصورة خلفه بالسحب والتكبير، ثم تؤكد أو تلغي.',
      en: 'Name, photo, and cover. Save turns on when something changed. Cropping keeps the frame still and you move the photo behind it with drag and zoom, then confirm or cancel.',
    },
    steps: {
      ar: ['عدّل الحقول ثم احفظ.', 'لاختيار صورة: اختر الملف، حرّكها، كبّرها، ثم أكّد.', 'الإلغاء يُبقي الصورة السابقة.', 'المشاركة العامة تعرض الاسم والصور فقط.'],
      en: ['Edit the fields, then save.', 'For a photo: choose the file, pan, zoom, then confirm.', 'Cancel keeps the previous photo.', 'A public share shows the name and photos only.'],
    },
    example: {
      ar: 'تريد صورة أوضح للمشاركة. تختار الصورة، تقرّبها على الوجه، تؤكد، ثم تحفظ الملف. الزميل يرى الاسم والصورة بلا بريد أو هاتف.',
      en: 'You want a clearer photo for sharing. You pick the image, zoom toward your face, confirm, then save. A teammate sees the name and photo without email or phone.',
    },
  },
  {
    id: 'sharing',
    icon: Share2,
    title: { ar: 'المشاركة', en: 'Sharing' },
    purpose: { ar: 'إعطاء الزميل ما يحتاج، بلا فتح حسابك.', en: 'Give a teammate what they need, without opening your account.' },
    what: {
      ar: 'مشاركة المباراة رابط للمعاينة. المستلم يحفظ نسخة محلية فقط إذا سمح الرابط بذلك. مشاركة الملف لا تتضمن البريد أو الهاتف.',
      en: 'A match share is a preview link. The recipient saves a local copy only when the link allows it. A profile share does not include email or phone.',
    },
    steps: {
      ar: ['من المباراة اختر مشاركة.', 'انسخ الرابط أو أرسله.', 'المستلم يعاين ثم يقرر الحفظ.', 'بياناتك الأصلية لا تُستبدل وحدها.'],
      en: ['From the match, choose Share.', 'Copy the link or send it.', 'The recipient previews, then decides whether to save.', 'Your original data is not replaced on its own.'],
    },
    example: {
      ar: 'بعد تحديد مباراة الجمعة ترسل الرابط للمجموعة. كل زميل يفتح المعاينة على جهازه دون الدخول إلى ملفك.',
      en: 'After Friday’s match is set, you send the link to the group. Each teammate opens the preview on their own device without entering your profile.',
    },
  },
  {
    id: 'notifications',
    icon: Bell,
    title: { ar: 'الإشعارات', en: 'Notifications' },
    purpose: { ar: 'تذكير بالمباراة على هذا الجهاز.', en: 'A match reminder on this device.' },
    what: {
      ar: 'يصل تنبيه عند اقتراب المباراة أو بدئها أو انتهائها. تُحفظ محليًا. من زر الجرس تعلّمها مقروءة أو تحذفها.',
      en: 'A notice arrives when a match is approaching, starting, or finished. Notices stay on this device. From the bell you mark them read or delete them.',
    },
    steps: {
      ar: ['افتح الجرس من الشريط العلوي.', 'اقرأ التنبيه.', 'علّمه مقروءًا أو احذفه.', 'الإشعارات لا تُرسل إلى حساب سحابي.'],
      en: ['Open the bell in the top bar.', 'Read the notice.', 'Mark it read or delete it.', 'Notices are not sent to a cloud account.'],
    },
    example: {
      ar: 'مباراة الجمعة تقترب. يظهر تنبيه بالموعد حتى لا تعتمد على الذاكرة فقط.',
      en: 'Friday’s match is approaching. A notice shows the kickoff so you are not relying on memory alone.',
    },
  },
  {
    id: 'settings',
    icon: Settings,
    title: { ar: 'الإعدادات', en: 'Settings' },
    purpose: { ar: 'لغة الجهاز ومظهره وبياناته.', en: 'Language, appearance, and data on this device.' },
    what: {
      ar: 'اللغة تعكس اتجاه الواجهة. المظهر يبدّل الداكن والفاتح. الحركة والإشعارات والتحليلات مفاتيح محلية. البريد هنا اختياري والتحقق منه غير مفعّل بعد. التصدير والاستيراد نسخة احتياطية. إعادة الضبط تحذف بيانات TAAMEN من هذا المتصفح بعد مهلة تأكيد.',
      en: 'Language flips the interface direction. Appearance switches dark and light. Motion, notifications, and analytics are local switches. Email here is optional and verification is not active yet. Export and import are a backup. Reset deletes TAAMEN data from this browser after a confirmation wait.',
    },
    steps: {
      ar: ['للغة: الإعدادات ← اللغة.', 'للمظهر: بدّل الداكن أو الفاتح.', 'للنسخة الاحتياطية: صدّر ملفًا واستورده على جهاز آخر.', 'إعادة الضبط لا تُلغى، لذا اقرأ التحذير.'],
      en: ['For language: Settings → Language.', 'For appearance: switch dark or light.', 'For a backup: export a file and import it on another device.', 'Reset cannot be undone, so read the warning.'],
    },
    example: {
      ar: 'تريد الواجهة بالإنجليزية. من الإعدادات تغيّر اللغة، فيصبح الاتجاه من اليسار ويتبدّل النص.',
      en: 'You want the interface in Arabic. From Settings you change the language, the direction becomes right-to-left, and the labels switch.',
    },
    tip: { ar: 'معرّف العضو المميز للتعرّف فقط، ويفتح سجلًا تاريخيًا للقراءة.', en: 'A Featured Member identifier only recognizes you. It opens a read-only historical archive.' },
  },
  {
    id: 'support',
    icon: LifeBuoy,
    title: { ar: 'الدعم', en: 'Support' },
    purpose: { ar: 'رسالة للفريق، مع حالة إرسال واضحة.', en: 'A message to the team, with a clear send state.' },
    what: {
      ar: 'النموذج يرسل عبر TAAMEN. أثناء الإرسال يتعطّل الزر. عند النجاح يبقى النص ظاهرًا وتظهر حالة «أُرسلت». عند الفشل تبقى الرسالة لإعادة المحاولة. واتساب والقناة الرسمية متاحان من الصفحة نفسها.',
      en: 'The form sends through TAAMEN. While sending, the button is disabled. On success the text stays visible and the button shows Sent. On failure the message stays so you can retry. WhatsApp and the official channel are on the same page.',
    },
    steps: {
      ar: ['اكتب الصفحة وما فعلت وما حدث.', 'أرسل وانتظر حالة الزر.', 'إذا فشل الإرسال، عدّل النص وأعد المحاولة.', 'لا تكتب «الموقع لا يعمل» فقط.'],
      en: ['Name the page, what you did, and what happened.', 'Send and watch the button state.', 'If sending fails, edit the text and try again.', 'Do not write only “the site is broken.”'],
    },
    example: {
      ar: 'بدل «لا يعمل»: «في السجل، بعد إدخال نتيجة مباراة الجمعة، لم تظهر في النتائج المسجّلة.»',
      en: 'Instead of “it does not work”: “In Archive, after I entered Friday’s score, the match did not move to recorded results.”',
    },
  },
];

const wants: { ar: string; en: string; go: Copy }[] = [
  { ar: 'أرى مباراتي القادمة', en: 'See my upcoming match', go: { ar: 'الرئيسية أو مركز المباريات', en: 'Home or Match Center' } },
  { ar: 'أجد مباراة قديمة', en: 'Find an old match', go: { ar: 'السجل', en: 'Archive' } },
  { ar: 'أتأكد من ملعب', en: 'Check a venue', go: { ar: 'الملاعب', en: 'Stadiums' } },
  { ar: 'أحدّث اسمي أو صورتي', en: 'Update my name or photo', go: { ar: 'الملف الشخصي', en: 'Profile' } },
  { ar: 'أغيّر اللغة أو المظهر', en: 'Change language or theme', go: { ar: 'الإعدادات', en: 'Settings' } },
  { ar: 'أراسِل TAAMEN', en: 'Contact TAAMEN', go: { ar: 'الدعم', en: 'Support' } },
  { ar: 'أرسل تفاصيل مباراة', en: 'Send match details', go: { ar: 'مشاركة من المباراة', en: 'Share on the match' } },
];

export default function HowToGuide({ language, open, onClose }: { language: Language; open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const ar = language === 'ar';
  const section = sections[index];
  const Icon = section.icon;
  const steps = section.steps[language];

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <button className="overlay-backdrop" aria-label={ar ? 'إغلاق' : 'Close'} onClick={onClose} />
      <aside className="guide-modal">
        <header>
          <div>
            <span className="eyebrow">TAAMEN / GUIDE</span>
            <h2 id="guide-title">{ar ? 'كيف يعمل TAAMEN' : 'How TAAMEN works'}</h2>
            <p className="guide-lead">{ar ? 'اقرأ مرة لتعرف أين تذهب، ولماذا، وماذا يحدث بعد ذلك.' : 'Read once to see where to go, why, and what happens next.'}</p>
          </div>
          <button className="icon-button large" onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'}><X /></button>
        </header>
        <nav className="guide-nav" aria-label={ar ? 'أقسام الدليل' : 'Guide sections'}>
          {sections.map((item, itemIndex) => (
            <button key={item.id} type="button" className={itemIndex === index ? 'is-active' : ''} aria-current={itemIndex === index ? 'true' : undefined} onClick={() => setIndex(itemIndex)}>
              {item.title[language]}
            </button>
          ))}
        </nav>
        <div className="guide-content">
          <section className="guide-section" key={section.id}>
            <div className="guide-section-header">
              <div className="guide-section-icon" aria-hidden="true"><Icon size={18} /></div>
              <div>
                <h3>{section.title[language]}</h3>
                <p className="guide-purpose">{section.purpose[language]}</p>
              </div>
            </div>
            <h4>{ar ? 'ما هذا؟' : 'What it is'}</h4>
            <p className="guide-section-content">{section.what[language]}</p>
            <h4>{ar ? 'كيف تستخدمه' : 'How to use it'}</h4>
            <ol className="guide-steps">{steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <div className="guide-example">
              <strong>{ar ? 'مثال' : 'Example'}</strong>
              <p>{section.example[language]}</p>
            </div>
            {section.tip && <p className="guide-next">{section.tip[language]}</p>}
            {section.id === 'support' && (
              <ul className="guide-wants">
                {wants.map((item) => (
                  <li key={item.en}><span>{item[language]}</span><b>{item.go[language]}</b></li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <footer className="guide-footer">
          <button type="button" className="dark-action" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
            {ar ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
            {ar ? 'السابق' : 'Previous'}
          </button>
          <span dir="ltr">{index + 1} / {sections.length}</span>
          {index < sections.length - 1
            ? <button type="button" className="primary-action" onClick={() => setIndex((value) => Math.min(sections.length - 1, value + 1))}>
              {ar ? 'التالي' : 'Next'}
              {ar ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
            : <button type="button" className="primary-action" onClick={onClose}>{ar ? 'تم' : 'Done'}</button>}
        </footer>
      </aside>
    </div>
  );
}
