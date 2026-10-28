import { HomeCinematicIntro } from "@/components/ui/home-cinematic-intro";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import Link from "next/link";

const repositoryUrl = "https://github.com/gatik1234err/zombie";

export default function HomePage() {
  return (
    <HomeCinematicIntro>
      <main className="zombie-home">
        <div className="zombie-home__grain" aria-hidden="true" />
        <nav className="zombie-home__nav">
          <Link href="/" className="zombie-home__brand">ZOMBIE API</Link>
          <span className="zombie-home__signal"><i /> Live edge signal</span>
        </nav>
        <section className="zombie-home__hero">
          <p className="zombie-home__eyebrow">A detection layer for the living network</p>
          <h1><span>ZOMBIE API</span><em>DETECTOR</em></h1>
          <p className="zombie-home__copy">See every request before it becomes a threat. Observe, route, and keep your infrastructure alive.</p>
          <div className="zombie-home__actions">
            <LiquidGlassButton href={repositoryUrl} icon="download">DOWNLOAD</LiquidGlassButton>
            <Link href="/globe-cdn" className="zombie-home__text-link">Explore the network <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
        <footer className="zombie-home__footer">
          <span>ZA—001 / SIGNAL DETECTION SYSTEM</span>
          <Link href="/skiper39">CrowdCanvas / Skiper39 ↗</Link>
        </footer>
      </main>
    </HomeCinematicIntro>
  );
}
