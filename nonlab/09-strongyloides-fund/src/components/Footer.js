import React from 'react';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-share">
          <span>Share this campaign:</span>
          <button className="share-btn" title="Share on Facebook">f</button>
          <button className="share-btn" title="Share on X">𝕏</button>
          <button className="share-btn" title="Share on Truth Social">T</button>
          <button className="share-btn" title="Share on Gab">G</button>
        </div>
        <div className="footer-links">
          <button className="footer-link">Report This Campaign</button>
          <span className="footer-sep">&middot;</span>
          <button className="footer-link">Terms of Service</button>
          <span className="footer-sep">&middot;</span>
          <button className="footer-link">Privacy Policy</button>
          <span className="footer-sep">&middot;</span>
          <button className="footer-link">Contact the Research Team</button>
        </div>
        <div className="footer-disclaimer">
          <p>
            This campaign is operated independently and is not affiliated with any academic
            institution, pharmaceutical company, or government agency. FundRealScience&trade; is a
            registered trademark of FundRealScience Holdings LLC (Delaware, registration pending).
            Campaign ID: FS-2026-00047-IVM-MB.
          </p>
          <p>
            The statements on this page have not been evaluated by the Food and Drug
            Administration, the National Institutes of Health, or the World Health Organization.
            The proposed research is not intended to diagnose, treat, cure, or prevent any disease.
            All claims regarding therapeutic potential are based on proposed mechanisms of action
            and have not been validated in clinical or pre-clinical studies. Contributors should
            be aware that scientific research outcomes are inherently uncertain.
          </p>
          <p className="footer-fund-disclaimer">
            <strong>Fund Use Disclaimer:</strong> All funds raised through this campaign are
            received at the sole discretion of the Principal Investigator, Eric T. Perkey, MD,
            PhD, and may be allocated to any project or initiative he deems to be of scientific
            interest. Contributions may not directly fund the specific Aims described above.
            By contributing, donors acknowledge that the Principal Investigator retains full
            authority over the use of funds and is not obligated to allocate them to the
            Strongyloides-ivermectin-methylene blue research program as described on this page.
          </p>
          <p className="footer-endorsement-disclaimer">
            <strong>Endorsement Disclaimer:</strong> The endorsements attributed to Robert F.
            Kennedy Jr., Mel Gibson, Joe Rogan, and other public figures on this page are
            entirely hypothetical and are presented for satirical purposes only. These
            individuals have not endorsed, supported, or been consulted regarding this campaign.
          </p>
          <p className="footer-copyright">
            &copy; 2026 FundRealScience&trade; &middot; All rights reserved &middot; Democratizing
            Discovery Since 2026
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
