import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-social">
            <a
              href="https://scholar.google.com/citations?user=8AF8PccAAAAJ&hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
            >
              Google Scholar
            </a>
            <a
              href="https://github.com/etperkey"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
            >
              GitHub
            </a>
            <a
              href="https://orcid.org/0000-0003-3275-3181"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
            >
              ORCID
            </a>
            <a
              href="https://honcfellowship.uchicago.edu/our-fellows/eric-perkey/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
            >
              UChicago
            </a>
            <a
              href="https://www.doximity.com/pub/eric-perkey-md"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
            >
              Doximity
            </a>
          </div>
          <p className="footer-text">
            &copy; {currentYear} Eric Perkey, MD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
