import Nav from '@/components/sections/Nav';
import Hero from '@/components/sections/Hero';
import Statement from '@/components/sections/Statement';
import Gallery from '@/components/sections/Gallery';
import Logos from '@/components/sections/Logos';
import Steps from '@/components/sections/Steps';
import Presets from '@/components/sections/Presets';
import Performance from '@/components/sections/Performance';
import Testimonials from '@/components/sections/Testimonials';
import Faq from '@/components/sections/Faq';
import Footer from '@/components/sections/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Statement />
        <Gallery />
        <Logos />
        <Steps />
        <Presets />
        <Performance />
        <Testimonials />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
