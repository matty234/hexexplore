import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="not-found-container">
      <div className="title-bar">
        <Link to="/" className="title">
          HEX<span className="highlight-green">Plore</span>
          <span className="cursor-block">█</span>
        </Link>
      </div>
      <div className="not-found-content">
        <div className="not-found-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="back-home">
          Back to Home
        </Link>
      </div>
    </div>
  )
} 