import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store error info for potential recovery
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        url: window.location.href
      };

      // Store last 5 errors
      const existingLogs = JSON.parse(localStorage.getItem('research-dashboard-error-logs') || '[]');
      existingLogs.unshift(errorLog);
      localStorage.setItem('research-dashboard-error-logs', JSON.stringify(existingLogs.slice(0, 5)));
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    if (window.confirm('This will clear cached data and reload the app. Your synced data in Google Drive will be preserved. Continue?')) {
      // Keep Google auth and API keys, clear everything else
      const keysToKeep = [
        'research-dashboard-api-keys',
        'research-dashboard-ai-providers',
        'research-dashboard-google-auth'
      ];

      const preserved = {};
      keysToKeep.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) preserved[key] = value;
      });

      // Clear all localStorage
      localStorage.clear();

      // Restore preserved keys
      Object.entries(preserved).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      window.location.reload();
    }
  };

  handleExportData = () => {
    try {
      const allData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('research-dashboard-')) {
          try {
            allData[key] = JSON.parse(localStorage.getItem(key));
          } catch {
            allData[key] = localStorage.getItem(key);
          }
        }
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-dashboard-emergency-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export data: ' + e.message);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h1>Something went wrong</h1>
            <p className="error-message">
              The application encountered an unexpected error. Your data should be safe.
            </p>

            <div className="error-actions">
              <button
                className="error-btn primary"
                onClick={this.handleReload}
              >
                Reload Application
              </button>

              <button
                className="error-btn secondary"
                onClick={this.handleExportData}
              >
                Export Data Backup
              </button>

              <button
                className="error-btn danger"
                onClick={this.handleClearAndReload}
              >
                Clear Cache & Reload
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Technical Details</summary>
                <pre>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <p className="error-help">
              If this problem persists, try exporting your data backup first,
              then use "Clear Cache & Reload". Your Google Drive synced data will be restored.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
