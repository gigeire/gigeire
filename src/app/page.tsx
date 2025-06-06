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
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.brandTagline}>
              <span className={styles.brandLogo}>GigÉire</span>
              <span className={styles.tagline}>The Irish Creatives' App</span>
            </div>
            <h1>Built for Creators Who Actually Want to Create</h1>
            <p>The business app that actually gets creatives. Manage gigs, clients, and payments without killing your creative buzz.</p>
            <Link href="/auth" className={styles.ctaButton}>
              Start Creating, Not Managing
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
        <h2>GigÉire handles the boring stuff so you can focus on the fun stuff</h2>
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
            <h3>📧 Communication Chaos</h3>
            <p>Important gig details buried in email threads, last-minute changes lost in WhatsApp, client info scattered everywhere. You need one place to see it all.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          <h2 style={{ gridColumn: '1/-1', fontSize: '2.5rem', textAlign: 'center', marginBottom: '3rem', color: '#1f2937' }}>
            Everything You Need, Nothing You Don't
          </h2>
          <div className={styles.featureCard}>
            <h3>🎯 Smart Gig Tracking</h3>
            <p>From inquiry to payment, see your entire pipeline at a glance. Know exactly where each gig stands without hunting through emails or notebooks.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>💳 Effortless Invoicing</h3>
            <p>Professional invoices sent automatically. No more awkward "hey, did you get my invoice?" conversations. Just clean, branded invoices that get paid faster.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>👥 Client Relationships</h3>
            <p>Remember every detail about your best clients. Their preferences, payment history, and upcoming projects - all in one beautiful, organized place.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>📱 Mobile-First Design</h3>
            <p>Update gig status from the venue, send invoices between sets, check payments on the go. Your business runs on your phone, so your app should too.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>💰 Payment Insights</h3>
            <p>See your earning patterns, outstanding amounts, and cash flow at a glance. Make informed decisions about your creative business without the spreadsheet headaches.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>⚡ Lightning Fast</h3>
            <p>Built for speed and simplicity. Add a gig, send an invoice, mark as paid - all in seconds, not minutes. Because your time is creative time.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaContent}>
          <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '2rem' }}>
            Ready to Get Your Life Back?
          </h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>
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
