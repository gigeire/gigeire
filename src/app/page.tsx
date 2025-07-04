import Link from 'next/link';
import styles from './MarketingPage.module.css';
import Image from 'next/image';

export const metadata = {
  title: "GigÉire – Stop Chasing Invoices, Start Creating More",
  description: "The only app Irish creatives need to manage gigs, clients, and payments. Built for photographers, videographers, DJs, and designers.",
};

export default function MarketingPage() {
  return (
    <>
      {/* LIVE PAGE CONFIRMED */}
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.brandTagline}>
              <span className={styles.brandLogo}>GigÉire</span>
              <span className={styles.tagline}>The Irish Creatives' App</span>
            </div>
            <h1>Stop Losing Track. Start Getting Paid On Time.</h1>
            <p>GigÉire keeps your gigs, payments, and clients in one clean, mobile-friendly space. Manage your business without killing your creative buzz.</p>
            <Link href="/auth" className={styles.ctaButton}>
              Try It Free – Add Your First Gig in 30 Seconds
            </Link>
          </div>
          <div className={styles.heroVisual} aria-label="Creative visual with floating UI">
            <Image
              src="/images/glowingbook_transparent.png"
              alt="Glowing book symbolizing creative ideas"
              width={240}
              height={240}
              style={{ objectFit: 'contain' }}
              priority
              className={styles.hideOnMobile}
            />
            <div className={`${styles.floatingUi} ${styles.ui1} ${styles.hideOnMobile}`}>
              <div className={styles.uiHeader}>Dashboard Overview</div>
              <div className={styles.uiContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
                  <span>Confirmed</span>
                  <span className={styles.uiMetric}>€1,400</span>
                </div>
                <div className={styles.uiStatus}>This Week</div>
              </div>
            </div>
            <div className={`${styles.floatingUi} ${styles.ui2} ${styles.hideOnMobile}`}>
              <div className={styles.uiHeader}>Client Profile</div>
              <div className={styles.uiContent}>
                <strong>Dave O'Rourke</strong><br />
                Total Earned: <span style={{ color: '#4ade80', fontWeight: 600 }}>€500</span><br />
                <span className={`${styles.uiStatus} ${styles.uiStatusPurple}`}>Paid</span>
              </div>
            </div>
            <div className={`${styles.floatingUi} ${styles.ui3} ${styles.hideOnMobile}`}>
              <div className={styles.uiHeader}>Upcoming Gig</div>
              <div className={styles.uiContent}>
                <strong>Powerspike Promotional</strong><br />
                4 June 2025 • €650<br />
                <span className={`${styles.uiStatus} ${styles.uiStatusYellow}`}>Invoice Sent</span>
              </div>
            </div>
            <div className={`${styles.floatingUi} ${styles.ui4} ${styles.hideOnMobile}`}>
              <div className={styles.uiHeader}>Gig Status</div>
              <div className={styles.uiContent}>
                <strong>Mark & Sarah Day 2</strong><br />
                14 June 2025 • €250<br />
                <span className={`${styles.uiStatus} ${styles.uiStatusYellow}`}>Invoice Sent</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className={styles.section}>
        <h2>We handle the boring stuff so you stay in your flow.</h2>
        <div className={styles.problemCards}>
          <div className={styles.problemCard}>
            <h3>😤 Spreadsheet Hell</h3>
            <p>You became a creative to make beautiful things, not to wrestle with Excel formulas and track payments in chaotic spreadsheets that make you want to scream.</p>
          </div>
          <div className={styles.problemCard}>
            <h3>💸 Payment Nightmares</h3>
            <p>Chasing clients for payments kills your creative energy. You shouldn't have to choose between getting paid and maintaining your artistic integrity.</p>
          </div>
          <div className={styles.problemCard}>
            <h3>🤯 Admin Overload</h3>
            <p>Every hour spent on invoices, scheduling, and client management is an hour stolen from your craft. The business side shouldn't drain your creative soul.</p>
          </div>
          <div className={styles.problemCard}>
            <h3>📧 Lost in the Threads</h3>
            <p>"Was that in an email, a DM, or a voice note?" Important gig info gets buried fast — you need one place to keep it all.</p>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '1.15rem', color: '#4B5563' }}>
          👇 That's why GigÉire keeps everything — clients, gigs, payments — in one clean place 👇
        </p>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          <h2 style={{ gridColumn: '1/-1', fontSize: '2.5rem', textAlign: 'center', marginBottom: '3rem', color: '#1f2937' }}>
            Everything You Need, Nothing You Don't.
          </h2>
          <div className={styles.featureCard}>
            <h3>🎯 Smart Gig Tracking</h3>
            <p>From inquiry to paid, track your gigs at a glance — no more spreadsheet gymnastics or WhatsApp rabbit holes.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>💳 Effortless Invoicing</h3>
            <p>Send clean, branded invoices from your phone in seconds. Clients can pay faster — and you look more professional.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>👥 Client Profiles</h3>
            <p>Keep notes, payments, and PDFs for every client in one clean profile. Never forget a name or detail again.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>📱 Mobile-First Design</h3>
            <p>Built for freelancers who run their business from their phone. Send an invoice or check payments — even from the gig.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>💰 Payment Insights</h3>
            <p>See what's paid, what's overdue, and what's still brewing. No more guessing where your cash flow stands.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>⚡ Lightning Fast</h3>
            <p>Add a gig, mark it paid, or fire off an invoice — all in under 30 seconds. Because time is creative time.</p>
          </div>
        </div>
      </section>

      {/* Product Gallery Section */}
      <section className={styles.productGallerySection}>
        <div className={styles.galleryContent}>
          <h2>Track. Invoice. Get Paid. <span className="whitespace-nowrap">All From Your Phone.</span></h2>
          <p className={styles.gallerySubhead}>
            See why freelancers are switching to GigÉire.
          </p>
          <p className={`${styles.gallerySubhead} ${styles.mobileOnly}`}>
            Swipe below to see how it works.
          </p>

          {/* Mobile Navigation Arrows */}
          <div className={`${styles.galleryNavArrows} ${styles.left}`}></div>
          <div className={`${styles.galleryNavArrows} ${styles.right}`}></div>

          {/* Desktop Grid */}
          <div className={styles.galleryGrid}>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Know Where You Stand at a Glance</p>
              <img src="/images/1.png" alt="Dashboard Overview" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Add a New Gig in Under 30 Seconds</p>
              <img src="/images/2.png" alt="Add New Gig" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Filter Gigs Fast — No Scrolling Needed</p>
              <img src="/images/3.png" alt="All Gigs View" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Send a Branded Invoice in Seconds</p>
              <img src="/images/4.png" alt="Create Invoice" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Keep Full Client Histories in One Place</p>
              <img src="/images/5.png" alt="Client Profile" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Spot Income Gaps with Instant Insights</p>
              <img src="/images/6.png" alt="Analytics Dashboard" className={styles.galleryImage} />
            </div>
          </div>

          {/* Mobile Swipe */}
          <div className={styles.gallerySwipe}>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Know Where You Stand at a Glance</p>
              <img src="/images/1.png" alt="Dashboard Overview" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Add a New Gig in Under 30 Seconds</p>
              <img src="/images/2.png" alt="Add New Gig" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Filter Gigs Fast — No Scrolling Needed</p>
              <img src="/images/3.png" alt="All Gigs View" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Send a Branded Invoice in Seconds</p>
              <img src="/images/4.png" alt="Create Invoice" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Keep Full Client Histories in One Place</p>
              <img src="/images/5.png" alt="Client Profile" className={styles.galleryImage} />
            </div>
            <div className={styles.galleryCard}>
              <p className={styles.galleryCaption}>Spot Income Gaps with Instant Insights</p>
              <img src="/images/6.png" alt="Analytics Dashboard" className={styles.galleryImage} />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaContent}>
          <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '2rem' }}>
            Ready to Get Your Life Back?
          </h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', opacity: 0.9 }}>     
          No training. No complex setup. Just open your phone and go.
          <br />  
          Join fellow creatives who've ditched the spreadsheets and reclaimed their creative energy.
          </p>
          <Link href="/auth" className={styles.ctaButton}>
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLeft}>Made with <span role="img" aria-label="love">❤️</span> in Ireland</div>
          <div className={styles.footerCenter}>GigÉire</div>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
            <Link href="/terms" className={styles.footerLink}>Terms & Conditions</Link>
            <a href="mailto:hello@gigeire.com" className={styles.footerLink}>Contact</a>
            <a href="https://instagram.com/gigeire" target="_blank" rel="noopener noreferrer" className={styles.footerLink} aria-label="Instagram">📷</a>
          </div>
        </div>
      </footer>
    </>
  );
}
