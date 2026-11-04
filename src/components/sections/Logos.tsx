import { logosData } from '@/data/logos';

export function Logos() {
  return (
    <section className="logos" aria-labelledby="logos-title">
      <div className="wrap wrap--logos">
        <div className="sec-head">
          <h2 className="h2" id="logos-title" data-reveal data-heading>
            Trusted by teams who ship faster with Kraft
          </h2>
          <a className="see-all" href="#" data-reveal>
            See all{' '}
            <svg aria-hidden="true">
              <use href="#i-arrow-right" />
            </svg>
          </a>
        </div>
        <ul className="logo-row" data-stagger>
          {logosData.map((logo) => (
            <li key={logo.id} data-reveal>
              <a className="logo-pill" href={logo.href}>
                <svg aria-hidden="true">
                  <use href={`#${logo.iconId}`} />
                </svg>
                <span>{logo.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Logos;
