/**
 * Single legal copy for the consent modal and the public /privacy and /terms pages.
 * Do not keep a second copy of these paragraphs.
 */
export const POLICY_PUBLISHED = '2026-09-23';

export type LegalLanguage = 'ar' | 'en';
export type LegalDocumentId = 'privacy' | 'terms';

export type LegalSection = {
  id: string;
  title: string;
  content: string;
};

export const privacySections: Record<LegalLanguage, LegalSection[]> = {
  ar: [
    { id: 'intro', title: 'مقدمة', content: 'TAAMEN تطبيق محلي-أولًا لإدارة مباريات كرة القدم على جهازك. الاستخدام العادي لا يتطلب حسابًا ولا كلمة مرور. تعرّف العضو المميز اختياري ويقتصر على سجل تاريخي للقراءة فقط.' },
    { id: 'collection', title: 'البيانات التي تبقى على جهازك', content: 'يحفظ TAAMEN محليًا: الاسم، الصورة والغلاف إن اخترتهما، البريد والهاتف إن أدخلتهما، المباريات والسجل، الخطط التكتيكية، الإشعارات، ولقطات الملعب. هذه البيانات تعيش في متصفحك (IndexedDB وlocalStorage) ولا تُرفع إلى حساب مستخدم عام.' },
    { id: 'storage', title: 'التخزين المحلي والنسخ الاحتياطي', content: 'مسح بيانات المتصفح يحذف بيانات TAAMEN المحلية. يمكنك تصدير نسخة احتياطية واستيرادها على هذا الجهاز أو جهاز آخر. الملفات غير الصالحة تُرفض قبل أي كتابة حتى لا تُفسَد بياناتك الحالية.' },
    { id: 'email', title: 'رسائل الدعم', content: 'عند إرسال رسالة من صفحة الدعم تُمرَّر عبر خادم TAAMEN إلى قناة التواصل الرسمية. المستلم يحدده الخادم، وليس النموذج. لا يُرسل بريد تلقائي دون إجراء منك. البريد في الملف اختياري ولا يُضمَّن في روابط المشاركة.' },
    { id: 'notifications', title: 'الإشعارات', content: 'إشعارات دورة حياة المباراة محلية داخل التطبيق. إن أوقفت الإشعارات من الإعدادات فلن تُسجَّل أحداث جديدة ولن تُستهلك حتى لا تضيع عند إعادة التفعيل. أذونات نظام التشغيل إن وُجدت تُدار عبر المتصفح.' },
    { id: 'analytics', title: 'تحليلات اختيارية', content: 'التحليلات متوقفة إلى أن تفعّلها من الإعدادات. عند التفعيل يحمّل TAAMEN سكربت Ahrefs من analytics.ahrefs.com في هذا المتصفح، ويمكن لذلك السكربت إرسال بيانات مشاهدة الصفحة إلى Ahrefs. لا يُحمَّل السكربت والإعداد متوقف. إيقاف الإعداد يسري في تحميل الصفحة التالي، لأن السكربت الذي بدأ في هذه الصفحة لا يمكن إلغاء تشغيله. بيانات المباريات والملف والسجل تبقى على هذا الجهاز، وTAAMEN لا يرسلها إلى Ahrefs.' },
    { id: 'advertising', title: 'الإعلانات', content: 'يحمّل TAAMEN رمز إعلانات Google لهذا الموقع. تبقى وحدات الإعلان متوقفة إلا إذا فُعّلت الإعلانات في صفحة يسمح بها ذلك. عند استخدام خدمات الإعلان، قد يستخدم Google وشركاؤه ملفات تعريف الارتباط أو تقنيات مشابهة. قد تجمع هذه التقنيات معلومات وتستخدمها لعرض الإعلانات وقياسها ومنع الاحتيال وتخصيص الإعلانات حيث ينطبق ذلك. قد ترى إعلانات مخصصة أو غير مخصصة بحسب الموافقة والإعدادات. يعالج Google المعلومات وفق سياساته الخاصة. راجع https://policies.google.com/privacy و https://policies.google.com/technologies/ads.' },
    { id: 'sharing', title: 'المشاركة', content: 'مشاركة المباراة اختيارية ومن إنشاء المستخدم. الرابط يحمل هوية المباراة وبصمة المحتوى، لا البريد ولا الهاتف ولا صورة الملف. السماح بالحفظ إذن داخل التطبيق وليس قفلًا تشفيريًا. الاستيراد لا يستبدل مباراة موجودة صامتًا: إن كانت نفس المباراة محدّثة تُعرض خيارات الإبقاء أو الاستبدال، وإن تصادف المعرّف مع أصل مختلف تُحفظ كنسخة جديدة فقط بعد تأكيدك.' },
    { id: 'featured', title: 'العضو المميز والسجل التاريخي', content: 'رمز العضو المميز معرّف للتعرّف وليس كلمة مرور. الجلسة تبقى على الخادم في ملف تعريف ارتباط HttpOnly وتفتح سجلًا تاريخيًا للقراءة فقط. لا توجد مساحة أعضاء محمية بكلمة مرور.' },
    { id: 'security', title: 'الأمان', content: 'الحماية من جانب العميل معقولة وليست ضمانًا مطلقًا. أمان الجهاز والمتصفح مهم. لا تُخزَّن كلمات مرور للملف المحلي العادي. لا تضع أسرارًا في روابط المشاركة.' },
    { id: 'deletion', title: 'الحذف', content: 'يمكنك تعديل الملف، تصدير البيانات، أو إعادة ضبط TAAMEN لحذف كل بياناته المحلية من هذا المتصفح. إعادة الضبط لا تمسح مواقع أخرى ولا سجل المتصفح.' },
    { id: 'changes', title: 'التغييرات', content: 'عند تغيير هذه النصوص جوهريًا يُرفع رقم الإصدار ويُطلب قبول جديد قبل المتابعة.' },
  ],
  en: [
    { id: 'intro', title: 'Introduction', content: 'TAAMEN is a local-first football match workspace on your device. Ordinary use needs no account and no password. Featured Member recognition is optional and opens a read-only historical record.' },
    { id: 'collection', title: 'What stays on your device', content: 'TAAMEN stores locally: your name, photo and cover if you add them, optional email and phone, matches and archive, tactical plans, notifications, and pitch captures. This lives in your browser (IndexedDB and localStorage) and is not uploaded to a general-user account.' },
    { id: 'storage', title: 'Local storage and backups', content: 'Clearing browser data deletes local TAAMEN data. You can export a backup and import it on this device or another. Malformed backup files are rejected before any write so your current data is not damaged.' },
    { id: 'email', title: 'Support messages', content: 'Messages from the Support page are posted to the TAAMEN backend, which owns the official EmailJS destination. This form cannot choose the recipient. No email is sent without your action. Profile email is optional and is never included in share links.' },
    { id: 'notifications', title: 'Notifications', content: 'Match lifecycle notices are in-app and local. If you turn notifications off in Settings, new events are not recorded and are not consumed, so they can still appear after you turn notices back on. Operating-system permission, if any, is handled by the browser.' },
    { id: 'analytics', title: 'Optional analytics', content: 'Analytics stays off until you turn it on in Settings. When it is on, TAAMEN loads the Ahrefs script from analytics.ahrefs.com in this browser. That script can send page-view data to Ahrefs. It is not loaded while the setting is off. Turning it off applies on the next page load, because a script that already started in this page cannot be un-run. Match, profile, and archive data stay on this device. TAAMEN does not send them to Ahrefs.' },
    { id: 'advertising', title: 'Advertising', content: 'TAAMEN loads Google advertising code for this site. Ad units stay off unless advertising is enabled on a page that allows them. When advertising services are used, Google and its partners may use cookies or similar technologies. Those technologies may collect and use information for ad delivery, measurement, fraud prevention, and personalization where that applies. You may see personalized or non-personalized ads depending on consent and settings. Google processes information under its own policies. See https://policies.google.com/privacy and https://policies.google.com/technologies/ads.' },
    { id: 'sharing', title: 'Sharing', content: 'Match sharing is user-initiated. The link carries match identity and a content fingerprint — not email, phone, or profile photos. Allow-save is an application permission, not a cryptographic lock. Import never silently overwrites: the same match with newer content offers Keep or Replace; an ID collision with a different origin can only be saved as a new local copy after you confirm.' },
    { id: 'featured', title: 'Featured Member and historical records', content: 'The Featured Member identifier is recognition, not a password. The session lives in an HttpOnly cookie on the server and opens a read-only historical archive. There is no password-protected member workspace.' },
    { id: 'security', title: 'Security', content: 'Client-side protection is reasonable, not absolute. Device and browser security matter. No passwords are stored for the ordinary local profile. Do not put secrets in share links.' },
    { id: 'deletion', title: 'Deletion', content: 'You can edit your profile, export data, or reset TAAMEN to delete all of its local data from this browser. Reset does not erase other sites or browser history.' },
    { id: 'changes', title: 'Policy changes', content: 'When this text changes in a material way, the policy version is raised and a new acceptance is required before you continue.' },
  ],
};

export const termsSections: Record<LegalLanguage, LegalSection[]> = {
  ar: [
    { id: 'intro', title: 'مقدمة', content: 'باستخدام TAAMEN توافق على استخدامه كأداة محلية لإدارة مباريات كرة القدم، وعلى أن البيانات العادية تبقى على جهازك ما لم تشاركها أو ترسل رسالة دعم.' },
    { id: 'acceptable-use', title: 'الاستخدام المقبول', content: 'استخدم التطبيق لإدارة مبارياتك وخططك. لا تستخدمه لانتحال الهوية أو إرسال محتوى مسيء عبر الدعم أو مشاركة بيانات لا يحق لك نشرها.' },
    { id: 'user-responsibility', title: 'مسؤوليتك', content: 'أنت مسؤول عن ما تُدخله وتشاركه. روابط المشاركة يمكن لأي حامل لها عرض المحتوى؛ تعامل معها كروابط عامة. السماح بالحفظ لا يمنع لقطة شاشة.' },
    { id: 'limitations', title: 'المحدوديات', content: 'يُقدَّم التطبيق كما هو. لا ضمان لاستمرارية الجهاز أو المتصفح أو النسخ الاحتياطي. السجل التاريخي للعضو المميز للقراءة فقط ويعتمد على توفر الخادم.' },
    { id: 'data', title: 'البيانات', content: 'يمكنك تصدير بياناتك أو حذفها بإعادة الضبط. الاستيراد يرفض الملفات التالفة قبل الكتابة. مشاركة المباراة لا تنشئ حسابًا على الخادم.' },
    { id: 'updates', title: 'التحديثات', content: 'قد تتحدث الشروط مع إصدارات التطبيق. الاستمرار بعد رفع رقم الموافقة يعني القبول.' },
  ],
  en: [
    { id: 'intro', title: 'Introduction', content: 'By using TAAMEN you agree to use it as a local football workspace, and that ordinary data stays on your device unless you share a match or send a support message.' },
    { id: 'acceptable-use', title: 'Acceptable use', content: 'Use the app to manage your matches and plans. Do not impersonate others, abuse Support, or share information you are not allowed to publish.' },
    { id: 'user-responsibility', title: 'Your responsibility', content: 'You are responsible for what you enter and share. Anyone with a share link can view that content; treat links as public. Allow-save does not prevent screenshots.' },
    { id: 'limitations', title: 'Limitations', content: 'The application is provided as is. There is no warranty that your device, browser, or backups will persist. Featured historical records are read-only and depend on the server being available.' },
    { id: 'data', title: 'Data', content: 'You can export your data or delete it with Reset. Import rejects malformed files before writing. Sharing a match does not create a server account.' },
    { id: 'updates', title: 'Updates', content: 'These terms may change with application releases. Continuing after a consent-version bump means you accept the update.' },
  ],
};

export function legalSections(document: LegalDocumentId, language: LegalLanguage): LegalSection[] {
  return document === 'privacy' ? privacySections[language] : termsSections[language];
}
