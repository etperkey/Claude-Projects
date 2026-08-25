import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-icon">📋</span>
        <span className="navbar-title">NCCN Guidelines Viewer</span>
      </Link>
      <div className="navbar-links">
        <Link to="/">Guidelines</Link>
        <Link to="/changelog">Changelog</Link>
      </div>
    </nav>
  );
}

export default Navbar;
