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
            <a href="#" aria-label="LinkedIn" className="social-link">
              LinkedIn
            </a>
            <a href="#" aria-label="GitHub" className="social-link">
              GitHub
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
