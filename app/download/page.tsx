import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { PageTransition } from "@/components/ui/page-transition";
import Link from "next/link";

const repositoryUrl = "https://github.com/gatik1234err/zombie";

export default function DownloadPage() {
  return (
    <PageTransition forceIntro mode="cinematic">
      <main className="download-page">
        <div className="download-page__noise" aria-hidden="true" />
        <nav className="download-page__nav">
          <Link href="/" className="download-page__brand" aria-label="Zombie API home">ZOMBIE API</Link>
          <span className="download-page__status"><span /> Operational worldwide</span>
        </nav>

        <section className="download-page__hero">
          <div className="download-page__eyebrow">The edge layer for the undead internet</div>
          <h1>DOWNLOAD</h1>
          <p>Ship faster. Route smarter. Keep every request alive.</p>
          <div className="download-page__actions">
            <LiquidGlassButton href="/" icon="external">ZOMBIE API</LiquidGlassButton>
            <LiquidGlassButton href={repositoryUrl} icon="download">DOWNLOAD</LiquidGlassButton>
          </div>
        </section>

        <footer className="download-page__footer">
          <span>ZA—001 / GLOBAL DELIVERY SYSTEM</span>
          <span>© {new Date().getFullYear()} ZOMBIE API</span>
        </footer>
      </main>
    </PageTransition>
  );
}
