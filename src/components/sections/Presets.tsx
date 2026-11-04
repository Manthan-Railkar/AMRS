import Image from 'next/image';
import { presetsData } from '@/data/presets';

export function Presets() {
  return (
    <section className="presets" id="templates" aria-labelledby="presets-title">
      <div className="wrap">
        <h2 className="h2" id="presets-title" data-reveal data-heading>
          Pre-built designs, ready to customize
        </h2>
        <div className="preset-grid" data-stagger>
          {presetsData.map((preset) => (
            <a key={preset.id} className="preset" href={preset.href} data-reveal>
              <Image
                src={preset.image}
                alt=""
                width={preset.width}
                height={preset.height}
              />
              <span>{preset.title}</span>
            </a>
          ))}
        </div>
        <div className="preset-foot" data-reveal>
          <p>Skip the blank canvas. Start with curated presets crafted for specific industries and use cases.</p>
          <a className="see-all" href="#">
            See all{' '}
            <svg aria-hidden="true">
              <use href="#i-arrow-right" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export default Presets;
