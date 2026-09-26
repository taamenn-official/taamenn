import { X, ArrowLeft, BookOpen, Archive, ClipboardList, Swords, Share2, Download, Bell, BadgeCheck, Smartphone, Mail, RotateCcw, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Language = 'ar' | 'en';
type Copy = { ar: string; en: string };

interface GuideSection {
  id: string;
  title: Copy;
  body: Copy;
  example?: Copy;
  next?: Copy;
  icon: LucideIcon;
}

const guideSections: GuideSection[] = [
  {
    id: 'getting-started',
    icon: BookOpen,
    title: { ar: 'البدء', en: 'Getting started' },
    body: {
      ar: 'أنشئ ملفًا محليًا بالاسم الأول. العائلة والبريد والهاتف اختيارية.',
      en: 'Create a local profile with your first name. Family name, email, and phone are optional.',
    },
    next: { ar: 'بعدها تفتح الرئيسية.', en: 'Home opens next.' },
  },
  {
    id: 'profile',
    icon: UserRound,
    title: { ar: 'الملف الشخصي', en: 'Profile' },
    body: {
      ar: 'الاسم والصورة والغلاف هويتك المحلية. الحفظ ينشط عند وجود تغيير. البريد والهاتف لا يظهران في المشاركة العامة.',
      en: 'Name, photo, and cover are your local identity. Save turns on when something changed. Email and phone stay out of public shares.',
    },
    example: { ar: 'اختر ← قص ← موضع ← حفظ', en: 'Choose → crop → position → save' },
    next: { ar: 'المغادرة مع تغيير غير محفوظ تُظهر تذكيرًا.', en: 'Leaving with unsaved changes shows a reminder.' },
  },
  {
    id: 'match-center',
    icon: ClipboardList,
    title: { ar: 'مركز المباريات', en: 'Match Center' },
    body: {
      ar: 'أضف مباراة قادمة بالفريقين والموعد والملعب والنوع. عند الانتهاء سجّل النتيجة ثم أرشِفها.',
      en: 'Add an upcoming match with both teams, kickoff, stadium, and type. When it ends, record the score and archive it.',
    },
    example: { ar: 'فريق أ × فريق ب، الجمعة 19:00، مباراة عادية، ملعب', en: 'Team A × Team B, Friday 19:00, normal match, stadium' },
  },
  {
    id: 'archive',
    icon: Archive,
    title: { ar: 'السجل', en: 'Archive' },
    body: {
      ar: 'السجل المحلي يضم ما أنشأته أو استوردته. ابحث بالفريق أو الملعب أو النوع. السجل التاريخي للأعضاء المميزين وللقراءة فقط.',
      en: 'The local archive holds matches you created or imported. Search by team, stadium, or type. Historical records are read-only for Featured Members.',
    },
    example: { ar: 'ريال مدريد 3 × 2 برشلونة، مسجّلة، مؤرشفة', en: 'Real Madrid 3 × 2 Barcelona, recorded, archived' },
  },
  {
    id: 'player-contributions',
    icon: Swords,
    title: { ar: 'مساهمات اللاعبين', en: 'Player contributions' },
    body: {
      ar: 'عند الأرشفة يمكنك إضافة حتى 5 لاعبين لكل فريق: أهداف وتسديدات. المجموع يُحسب تلقائيًا.',
      en: 'When archiving, you can add up to 5 players per team: goals and assists. The total is calculated for you.',
    },
    next: { ar: 'الميزة اختيارية لكل مباراة.', en: 'This stays optional for each match.' },
  },
  {
    id: 'tactical',
    icon: Swords,
    title: { ar: 'الملعب التكتيكي', en: 'Tactical Playground' },
    body: {
      ar: 'رتّب اللاعبين على الملعب، اختر التشكيلة، وعيّن الدور. الخطة تُحفظ على جهازك.',
      en: 'Place players on the pitch, pick a formation, and assign a role. The plan stays on this device.',
    },
    example: { ar: '4-2-3-1، سحب، دور', en: '4-2-3-1, drag, role' },
    next: { ar: 'وضع التركيز أوضح بالعرض الأفقي.', en: 'Focus mode is clearer in landscape.' },
  },
  {
    id: 'sharing',
    icon: Share2,
    title: { ar: 'المشاركة', en: 'Sharing' },
    body: {
      ar: 'شارك مباراة أو سجلًا. المستلم يعاين ثم يحفظ محليًا إن أراد. بياناتك لا تُستبدل وحدها.',
      en: 'Share a match or archive record. The recipient previews, then saves locally if they want. Your data is not replaced on its own.',
    },
    example: { ar: 'رابط ← معاينة ← حفظ محلي', en: 'Link → preview → save locally' },
  },
  {
    id: 'profile-sharing',
    icon: Share2,
    title: { ar: 'مشاركة الملف', en: 'Profile sharing' },
    body: {
      ar: 'النسخة العامة تعرض الاسم والصور فقط. لا بريد ولا هاتف، ولا استيراد تلقائي.',
      en: 'The public copy shows your name and photos only. No email, no phone, and no automatic import.',
    },
  },
  {
    id: 'import-export',
    icon: Download,
    title: { ar: 'الاستيراد والتصدير', en: 'Import / export' },
    body: {
      ar: 'صدّر نسخة احتياطية واستوردها على جهاز آخر. الملفات التالفة تُرفض.',
      en: 'Export a backup and import it on another device. Corrupt files are rejected.',
    },
  },
  {
    id: 'featured',
    icon: BadgeCheck,
    title: { ar: 'الأعضاء المميزون', en: 'Featured Members' },
    body: {
      ar: 'من الإعدادات أدخل المعرّف user#****. هو للتعرّف وليس كلمة مرور، ويفتح السجل التاريخي للقراءة.',
      en: 'From Settings, enter the user#**** identifier. It recognizes you; it is not a password. It opens the historical archive for reading.',
    },
  },
  {
    id: 'notifications',
    icon: Bell,
    title: { ar: 'الإشعارات', en: 'Notifications' },
    body: {
      ar: 'يصل تنبيه عند اقتراب المباراة أو بدئها أو انتهائها، ويُحفظ على الجهاز. يمكن تعليمها مقروءة أو حذفها.',
      en: 'A notice arrives when a match is approaching, starting, or finished, and it stays on this device. Mark it read or delete it.',
    },
    example: { ar: 'مباراة تقترب خلال 24 ساعة', en: 'Match approaching within 24 hours' },
  },
  {
    id: 'pwa',
    icon: Smartphone,
    title: { ar: 'تثبيت TAAMEN', en: 'Install TAAMEN' },
    body: {
      ar: 'أضف TAAMEN إلى الشاشة الرئيسية لفتحه كتطبيق. التنبيهات في الخلفية تبقى محدودة بالمتصفح.',
      en: 'Add TAAMEN to your home screen to open it like an app. Background alerts stay limited by the browser.',
    },
  },
  {
    id: 'email',
    icon: Mail,
    title: { ar: 'البريد', en: 'Email' },
    body: {
      ar: 'البريد في الملف اختياري. صفحة الدعم ترسل رسالة للفريق ويصل رد تلقائي. التحقق من البريد لاحقًا.',
      en: 'Profile email is optional. Support sends a message to the team and an auto-reply comes back. Email verification comes later.',
    },
  },
  {
    id: 'reset',
    icon: RotateCcw,
    title: { ar: 'إعادة الضبط', en: 'Reset' },
    body: {
      ar: 'إعادة الضبط تحذف الملف والمباريات والسجل والخطة والإشعارات من هذا المتصفح. انتظر 5 ثوانٍ قبل التأكيد.',
      en: 'Reset deletes the profile, matches, archive, tactical plan, and notifications from this browser. Wait 5 seconds before confirming.',
    },
    next: { ar: 'لا يمكن التراجع.', en: 'This cannot be undone.' },
  },
];

export default function HowToGuide({ language, open, onClose }: { language: Language; open: boolean; onClose: () => void }) {
  const ar = language === 'ar';
  if (!open) return null;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={ar ? 'دليل الاستخدام' : 'How-to Guide'}>
      <button className="overlay-backdrop" aria-label="close" onClick={onClose} />
      <aside className="guide-modal">
        <header>
          <div>
            <span className="eyebrow">TAAMEN / GUIDE</span>
            <h2>{ar ? 'دليل الاستخدام' : 'How-to Guide'}</h2>
          </div>
          <button className="icon-button large" onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'}>
            <X />
          </button>
        </header>
        <div className="guide-content">
          {guideSections.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.id} className="guide-section">
                <div className="guide-section-header">
                  <div className="guide-section-icon" aria-hidden="true">
                    <Icon size={18} />
                  </div>
                  <h3>{section.title[language]}</h3>
                </div>
                <p className="guide-section-content">{section.body[language]}</p>
                {section.example && <p className="guide-example">{section.example[language]}</p>}
                {section.next && <p className="guide-next">{section.next[language]}</p>}
              </section>
            );
          })}
        </div>
        <footer>
          <button className="primary-action wide" onClick={onClose}>
            <ArrowLeft size={17} />
            {ar ? 'عودة' : 'Back'}
          </button>
        </footer>
      </aside>
    </div>
  );
}
