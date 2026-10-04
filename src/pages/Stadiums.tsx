import { useState } from 'react';
import { Search, MapPin, Phone, ChevronDown, ChevronUp, X, MessageCircle, Goal } from 'lucide-react';
import { searchStadiums } from '../data/stadiums';
import { WHATSAPP_URL } from '../config/support';
import { uiCopy } from '../i18n/translations';
import AdSlot from '../components/monetization/AdSlot';
import { requestMatchFromStadium } from '../services/stadiumHandoff';

type Language = 'ar' | 'en';

export default function Stadiums({ language }: { language: Language }) {
  const ar = language === 'ar';
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const filteredStadiums = searchStadiums(query, language);
  
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  const clearSearch = () => {
    setQuery('');
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return;
    const popup = window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
    if (popup) popup.opener = null;
  };

  return (
    <section className="page-content stadiums-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TAAMEN 2.0 / STADIUMS</p>
          <h1><Goal size={28} aria-hidden="true" />{ar ? 'الملاعب' : 'Stadiums'}</h1>
          <p className="subtitle">
            {ar
              ? 'مكتبة الملاعب المتاحة على هذا الجهاز. اختر ملعبًا لعرض موقعه، أو استخدمه عند إنشاء مباراة.'
              : 'The venue library on this device. Open a stadium for its location, or use it when you create a match.'}
          </p>
        </div>
      </div>

      <div className="stadiums-search">
        <label className="search-control">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ar ? 'ابحث عن ملعب أو مدينة…' : 'Search stadium or city…'}
            aria-label={ar ? 'بحث في الملاعب' : 'Search stadiums'}
          />
          {query && (
            <button
              type="button"
              className="clear-search"
              onClick={clearSearch}
              aria-label={ar ? 'مسح البحث' : 'Clear search'}
            >
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      {filteredStadiums.length > 0 ? (
        <div className="stadiums-list">
          {filteredStadiums.map((stadium) => {
            const isExpanded = expandedId === stadium.id;
            const name = ar ? stadium.nameAr : stadium.nameEn;
            const city = ar ? stadium.cityAr : stadium.cityEn;
            const location = ar ? stadium.locationAr : stadium.locationEn;
            const contact = stadium.contactPhone;
            const description = ar ? stadium.descriptionAr : stadium.descriptionEn;

            return (
              <article
                key={stadium.id}
                className={`stadium-card ${isExpanded ? 'is-expanded' : ''}`}
              >
                <button
                  className="stadium-card-header"
                  onClick={() => toggleExpand(stadium.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="stadium-card-main">
                    <Goal size={18} aria-hidden="true" />
                    <h3>{name}</h3>
                    <span className="stadium-city">{city}</span>
                  </div>
                  <div className="stadium-card-toggle">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="stadium-card-body">
                    {location && (
                      <div className="stadium-detail">
                        <MapPin size={16} />
                        <span>{location}</span>
                      </div>
                    )}
                    {contact && (
                      <div className="stadium-detail">
                        <Phone size={16} />
                        <span>{contact}</span>
                      </div>
                    )}
                    {description && (
                      <p className="stadium-description">{description}</p>
                    )}
                    <div className="stadium-actions">
                      <button type="button" className="primary-action stadium-use" onClick={() => { requestMatchFromStadium({ stadium: name, city: city || '' }); window.location.hash = '#match-center'; }}>{ar ? 'استخدمه في مباراة' : 'Use in a match'}</button>
                      {contact && (
                        <button
                          type="button"
                          className="dark-action whatsapp-button"
                          onClick={() => openWhatsApp(contact)}
                        >
                          <MessageCircle size={16} />
                          {ar ? 'واتساب الملعب' : 'WhatsApp venue'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state stadium-empty">
          <Search size={24} />
          <strong>{ar ? 'عذرًا، لا توجد ملاعب مطابقة لبحثك.' : 'Sorry, no stadiums match your search.'}</strong>
          {query && (
            <button className="text-button" onClick={clearSearch}>
              {ar ? 'مسح البحث' : 'Clear search'}
            </button>
          )}
        </div>
      )}

      <AdSlot placement="stadiums" />
      {filteredStadiums.length >= 4 && <AdSlot placement="stadiums-follow" />}

      <aside className="venue-admin-helper stadiums-support-note">
        <p>{uiCopy[language].missingStadiumPage}</p>
        {WHATSAPP_URL
          ? <a className="venue-admin-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer noopener"><MessageCircle size={14} aria-hidden="true"/>{uiCopy[language].contactAdminWhatsApp}</a>
          : null}
      </aside>
    </section>
  );
}
