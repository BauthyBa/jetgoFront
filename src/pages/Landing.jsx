import Navigation from '@/components/Navigation'
import HeroSection from '@/components/HeroSection'
import Benefits from '@/components/Benefits'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import CTA from '@/components/CTA'
import Reveal from '@/components/Reveal'

export default function Landing() {
  return (
    <div className="min-h-screen text-foreground bg-gradient-hero">
      <Navigation />
      <HeroSection />
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal delay={100}>
        <Benefits />
      </Reveal>
      <Reveal delay={200}>
        <Testimonials />
      </Reveal>
      <Reveal delay={250}>
        <CTA />
      </Reveal>
    </div>
  )
}


