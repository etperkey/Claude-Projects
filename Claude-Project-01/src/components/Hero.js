import React from 'react';

function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero-content">
        <img
          src="https://scholar.googleusercontent.com/citations?view_op=view_photo&user=8AF8PccAAAAJ&citpid=2"
          alt="Eric Perkey"
          className="hero-profile-image"
        />
        <p className="hero-greeting">Hello, I'm</p>
        <h1 className="hero-name">Eric Perkey, MD-PhD</h1>
        <h2 className="hero-title">Physician-Scientist | Immunologist | Lymphoma Fellow</h2>
        <p className="hero-description">
          Hematology/Oncology fellow at the University of Chicago investigating
          immune escape mechanisms in lymphoma and developing strategies to
          improve immunotherapy outcomes for patients with blood cancers.
        </p>
        <div className="hero-buttons">
          <a href="#projects" className="btn btn-primary">Current Research</a>
          <a href="#tools" className="btn btn-secondary">Data Tools</a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
