import codeCastersLogo from "../../assets/CodeCasters.jpeg";
import "./aboutUs.css";

const TEAM = [
  {
    name: "Sadrach Juan Diego García Flores",
    github: "https://github.com/Sadrach34",
  },
  {
    name: "Adrian Eduardo Santos Rosales",
    github: "https://github.com/AdrianS-127",
  },
  {
    name: "Jesús Adriana Martínez Trillas",
    github: "https://github.com/Alfion72",
  },
  {
    name: "Erick Daniel Arvayo Avilés",
    github: "https://github.com/Ddarielz",
  },
];

function AboutUs() {
  return (
    <div className="ct-page">
      {/* Hero */}
      <section className="ct-hero">
        <span className="ct-hero__badge">📬 Contáctanos</span>
        <h1 className="ct-hero__title">¿Cómo llegar a nuestra guarida?</h1>
        <p className="ct-hero__subtitle">
          Estamos en el corazón de Hermosillo, listos para recibir a todo
          aventurero que busque su próxima gran aventura.
        </p>
      </section>

      {/* Tarjetas de información */}
      <section className="ct-cards" data-testid="contact-cards">
        <div className="ct-card" data-testid="contact-address">
          <span className="ct-card__icon">📍</span>
          <h3 className="ct-card__title">Dirección</h3>
          <p className="ct-card__text">
            Av Jalisco 8A, Centro
            <br />
            83000 Hermosillo, Sonora
          </p>
        </div>

        <div className="ct-card" data-testid="contact-hours">
          <span className="ct-card__icon">🕐</span>
          <h3 className="ct-card__title">Horario</h3>
          <p className="ct-card__text">
            Lun – Vie: 10:00 – 20:00
            <br />
            Sáb: 10:00 – 21:00
            <br />
            Dom: 11:00 – 18:00
          </p>
        </div>

        <div className="ct-card" data-testid="contact-info">
          <span className="ct-card__icon">💌</span>
          <h3 className="ct-card__title">Contacto</h3>
          <p className="ct-card__text">
            contacto@goblinhub.mx
            <br />
            (662) 123-4567
          </p>
        </div>
      </section>

      {/* Equipo de desarrollo */}
      <section className="ct-team" data-testid="team-section">
        <img
          src={codeCastersLogo}
          alt="CodeCasters"
          className="ct-team__logo"
        />
        <h2 className="ct-team__title">Equipo de Desarrollo</h2>
        <p className="ct-team__subtitle">CodeCasters</p>
        <ul className="ct-team__list">
          {TEAM.map((member) => (
            <li key={member.name}>
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="ct-team__member"
              >
                <span>👾 {member.name}</span>
                <span className="ct-team__github-hint">GitHub ↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default AboutUs;
