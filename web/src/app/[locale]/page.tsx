import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { WebsiteShell } from '@/components/website/site-shell';
import { ProductDemo } from '@/components/website/product-demo';
import { Arrow } from '@/components/website/brand';
import { site } from '@/lib/site';
import { safeJsonLd } from '@/lib/metadata';
import '../website.css';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tSite = await getTranslations('site');
  const workflowCards = t.raw('workflow.cards') as { number: string; title: string; heading: string; body: string; foot: string }[];
  const detailItems = t.raw('details.items') as { n: string; h: string; p: string }[];
  const faqItems = t.raw('faq.items') as { q: string; a: string }[];

  return (
    <WebsiteShell>
      <main id="main-content">
        <section className="website-hero website-container">
          <div className="hero-kicker">
            <span className="status-dot" /> {t('hero.kicker')} <span className="hero-edition">{t('hero.edition')}</span>
          </div>
          <div className="hero-columns">
            <h1>
              {t('hero.titleLine1')}
              <br />
              <span>{t('hero.titleLine2')}</span>
            </h1>
            <div className="hero-intro">
              <p>
                {t('hero.introLine1')}
                <br />
                {t('hero.introLine2')}
                <br />
                {t('hero.introLine3')}
              </p>
              <div className="hero-actions">
                <Link className="website-button light" href="/download">
                  {t('hero.cta')} <Arrow diagonal />
                </Link>
                <a className="hero-demo-link" href="#experience">
                  {t('hero.demoLink')} <span>↓</span>
                </a>
              </div>
              <small>{t('hero.small')}</small>
            </div>
          </div>
          <div className="hero-handnote" aria-hidden="true">
            {t('hero.handnote')}
          </div>
        </section>

        <ProductDemo />

        <section className="website-workflow" aria-labelledby="workflow-title">
          <div className="website-container">
            <div className="section-heading">
              <span className="section-label">{t('workflow.label')}</span>
              <h2 id="workflow-title">
                {t('workflow.titleLine1')}
                <br />
                {t('workflow.titleLine2')}
              </h2>
              <p>
                {t('workflow.intro1')}
                <br />
                {t('workflow.intro2')}
                <br />
                {t('workflow.intro3')}
              </p>
            </div>
            <div className="workflow-grid">
              {workflowCards.map((card) => (
                <article key={card.number}>
                  <div className="workflow-top">
                    <span>{card.number}</span>
                    <h3>{card.title}</h3>
                    <Arrow />
                  </div>
                  <h4>{card.heading}</h4>
                  <p>{card.body}</p>
                  <small>{card.foot}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="website-details website-container" id="details">
          <div className="section-heading">
            <span className="section-label">{t('details.label')}</span>
            <h2>
              {t('details.titleLine1')}
              <br />
              {t('details.titleLine2')}
            </h2>
            <p>
              {t('details.intro1')}
              <br />
              {t('details.intro2')}
            </p>
          </div>
          <div className="details-layout">
            <div className="details-illustration" aria-label={t('details.miniPage.artAriaLabel')}>
              <div className="mini-page">
                <div className="mini-page-heading">
                  <span>{t('details.miniPage.eyebrow')}</span>
                  <span>{t('details.miniPage.number')}</span>
                </div>
                <h3>
                  {t('details.miniPage.titleLine1')}
                  <br />
                  {t('details.miniPage.titleLine2')}
                </h3>
                <div className="mini-art">
                  <svg viewBox="0 0 480 240" role="img" aria-label={t('details.miniPage.svgLabel')}>
                    <path d="M0 181 480 51v189H0Z" fill="#ddd9c9" />
                    <path d="M350 0v175M438 0v152M286 88h194" stroke="#b4bba5" strokeWidth="2" />
                    <path d="m65 145 116-46 110 62-125 49Z" fill="#f4f1e5" stroke="#6a775c" strokeWidth="2" />
                    <path d="m65 145 2 14 99 62 125-47v-13M166 210v11M181 99l-15 111" fill="none" stroke="#6a775c" strokeWidth="2" />
                    <path d="m82 151 65 39M91 144l65 39M207 128l48 27M201 139l37 21" stroke="#b7bea8" strokeWidth="2" />
                    <ellipse cx="354" cy="185" rx="44" ry="13" fill="#b9baa9" />
                    <path d="M326 132v38c0 23 51 23 51 0v-38" fill="#f2efe2" stroke="#6a775c" strokeWidth="2" />
                    <ellipse cx="351.5" cy="132" rx="25.5" ry="9" fill="#795e43" stroke="#6a775c" strokeWidth="2" />
                    <path d="M377 139c30-10 31 32 0 26M340 110c-14-12 12-17-1-31M356 111c-12-12 14-17 2-31" fill="none" stroke="#6a775c" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p>{t('details.miniPage.caption')}</p>
                <div className="mini-lines">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <span className="illustration-note">{t('details.illustrationNote')}</span>
            </div>
            <div className="detail-list">
              {detailItems.map((item) => (
                <article key={item.n}>
                  <span>{item.n}</span>
                  <div>
                    <h3>{item.h}</h3>
                    <p>{item.p}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="website-local">
          <div className="website-container local-layout">
            <div>
              <span className="section-label">{t('local.label')}</span>
              <h2>
                {t('local.titleLine1')}
                <br />
                {t('local.titleLine2')}
              </h2>
              <p>
                {t('local.intro1')}
                <br />
                {t('local.intro2')}
              </p>
              <Link className="website-text-link" href="/guide#files">
                {t('local.link')} <Arrow />
              </Link>
            </div>
            <div className="file-story" aria-label={t('local.aria')}>
              <div className="file-path">
                <span>⌂</span> {t('local.pathLabel')} <span>/</span> {t('local.pathProject')}
              </div>
              <div className="file-row">
                <span className="file-symbol">M↓</span>
                <div>
                  <strong>{t('local.fileName')}</strong>
                  <small>{t('local.fileSub')}</small>
                </div>
                <span className="file-check">✓</span>
              </div>
              <div className="file-assets">
                <span>└</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M3 7V4h6l3 3h9v13H3Z" />
                </svg>{' '}
                {t('local.assets')} <small>{t('local.assetsSub')}</small>
              </div>
              <div className="export-formats">
                <span>{t('local.exportIntro')}</span>
                <i>Markdown</i>
                <i>PDF</i>
                <i>HTML</i>
                <i>ZIP</i>
              </div>
            </div>
          </div>
        </section>

        <section className="website-faq website-container" id="faq">
          <div>
            <span className="section-label">{t('faq.label')}</span>
            <h2>
              {t('faq.titleLine1')}
              <br />
              {t('faq.titleLine2')}
            </h2>
            <Link className="website-text-link" href="/guide">
              {t('faq.link')} <Arrow />
            </Link>
          </div>
          <div className="faq-items">
            {faqItems.map((item) => (
              <details key={item.q}>
                <summary>
                  {item.q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="website-final">
          <div className="website-container">
            <span className="section-label">{t('final.label')}</span>
            <h2>
              {t('final.titleLine1')}
              <span>{t('final.titleLine2')}</span>
            </h2>
            <div>
              <p>{t('final.intro')}</p>
              <Link className="website-button dark" href="/download">
                {t('final.cta')} <Arrow diagonal />
              </Link>
              <small>{t('final.small')}</small>
            </div>
            <span className="final-watermark" aria-hidden="true">
              M
            </span>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: site.name,
              url: site.url,
              description: tSite('description'),
              applicationCategory: 'ProductivityApplication',
              operatingSystem: 'macOS (Apple Silicon)',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              inLanguage: [locale === 'zh' ? 'zh-CN' : 'en'],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqItems.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            }),
          }}
        />
      </main>
    </WebsiteShell>
  );
}
