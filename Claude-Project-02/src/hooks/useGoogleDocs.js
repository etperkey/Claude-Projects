import { useState, useEffect, useCallback } from 'react';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';

/**
 * Custom hook for Google Docs API integration
 * Provides authentication, document creation, and sync functionality
 */
function useGoogleDocs(isActive = true) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ message: '', type: '' });

  const hasCredentials = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);

  // Clear sync status after delay
  const clearSyncStatus = useCallback((delay = 3000) => {
    setTimeout(() => setSyncStatus({ message: '', type: '' }), delay);
  }, []);

  // Load Google API (gapi) for Docs/Drive
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !isActive) return;

    const loadGapi = () => {
      if (window.gapi && window.gapi.client) {
        initGapi();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load('client', initGapi);
      };
      document.body.appendChild(script);
    };

    const initGapi = async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: [
            'https://docs.googleapis.com/$discovery/rest?version=v1',
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
          ]
        });
        setGapiLoaded(true);
      } catch (error) {
        console.error('Error initializing gapi:', error);
      }
    };

    loadGapi();
  }, [isActive]);

  // Load Google Identity Services (GIS) for auth
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !isActive || gisLoaded) return;

    const loadGis = () => {
      if (window.google && window.google.accounts) {
        initGis();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGis;
      document.body.appendChild(script);
    };

    const initGis = () => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setIsSignedIn(true);
              setSyncStatus({ message: 'Signed in to Google!', type: 'success' });
              clearSyncStatus();
            }
          },
          error_callback: (error) => {
            console.error('GIS error:', error);
            setSyncStatus({ message: 'Sign-in failed. Please try again.', type: 'error' });
          }
        });
        setTokenClient(client);
        setGisLoaded(true);
      } catch (error) {
        console.error('Error initializing GIS:', error);
      }
    };

    loadGis();
  }, [isActive, gisLoaded, clearSyncStatus]);

  // Sign in handler
  const signIn = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  }, [tokenClient]);

  // Sign out handler
  const signOut = useCallback(() => {
    if (window.google && window.google.accounts && window.gapi?.client?.getToken()) {
      window.google.accounts.oauth2.revoke(window.gapi.client.getToken().access_token, () => {
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
        setSyncStatus({ message: 'Signed out', type: 'info' });
        clearSyncStatus(2000);
      });
    }
  }, [clearSyncStatus]);

  // Create a Google Doc
  const createDoc = useCallback(async (title, content) => {
    if (!gapiLoaded || !isSignedIn) {
      setSyncStatus({ message: 'Please sign in to Google first', type: 'error' });
      return null;
    }

    setSyncStatus({ message: 'Creating Google Doc...', type: 'info' });

    try {
      // Create the document
      const createResponse = await window.gapi.client.docs.documents.create({
        resource: { title }
      });

      const docId = createResponse.result.documentId;
      const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

      // Insert content into the document
      await window.gapi.client.docs.documents.batchUpdate({
        documentId: docId,
        resource: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content
              }
            }
          ]
        }
      });

      setSyncStatus({ message: 'Google Doc created successfully!', type: 'success' });
      clearSyncStatus();

      return { docId, docUrl };
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      setSyncStatus({ message: 'Failed to create Google Doc', type: 'error' });
      return null;
    }
  }, [gapiLoaded, isSignedIn, clearSyncStatus]);

  // Sync content to an existing Google Doc
  const syncToDoc = useCallback(async (docId, content) => {
    if (!gapiLoaded || !isSignedIn || !docId) {
      setSyncStatus({ message: 'Unable to sync - check connection', type: 'error' });
      return false;
    }

    setSyncStatus({ message: 'Syncing to Google Doc...', type: 'info' });

    try {
      // Get current document to find content length
      const doc = await window.gapi.client.docs.documents.get({
        documentId: docId
      });

      const endIndex = doc.result.body.content.slice(-1)[0]?.endIndex || 1;

      // Clear and rewrite document
      const requests = [];

      if (endIndex > 2) {
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: endIndex - 1
            }
          }
        });
      }

      requests.push({
        insertText: {
          location: { index: 1 },
          text: content
        }
      });

      await window.gapi.client.docs.documents.batchUpdate({
        documentId: docId,
        resource: { requests }
      });

      setSyncStatus({ message: 'Synced to Google Doc!', type: 'success' });
      clearSyncStatus();

      return true;
    } catch (error) {
      console.error('Error syncing to Google Doc:', error);
      setSyncStatus({ message: 'Failed to sync to Google Doc', type: 'error' });
      return false;
    }
  }, [gapiLoaded, isSignedIn, clearSyncStatus]);

  return {
    isSignedIn,
    gapiLoaded,
    gisLoaded,
    hasCredentials,
    syncStatus,
    setSyncStatus,
    signIn,
    signOut,
    createDoc,
    syncToDoc
  };
}

export default useGoogleDocs;
