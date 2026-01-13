import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';

const GoogleAuthContext = createContext(null);

export function GoogleAuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [user, setUser] = useState(null);

  const hasCredentials = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);

  // Load Google API (gapi) for Docs/Drive/Calendar
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

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
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
            'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
          ]
        });
        setGapiLoaded(true);
      } catch (error) {
        console.error('Error initializing gapi:', error);
      }
    };

    loadGapi();
  }, []);

  // Load Google Identity Services (GIS) for auth
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || gisLoaded) return;

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
          scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setIsSignedIn(true);
              // Try to get user info
              fetchUserInfo(tokenResponse.access_token);
            }
          },
          error_callback: (error) => {
            console.error('GIS error:', error);
          }
        });
        setTokenClient(client);
        setGisLoaded(true);
      } catch (error) {
        console.error('Error initializing GIS:', error);
      }
    };

    loadGis();
  }, [gisLoaded]);

  const fetchUserInfo = async (accessToken) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      setUser({
        name: data.name,
        email: data.email,
        picture: data.picture
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const signIn = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  }, [tokenClient]);

  const signOut = useCallback(() => {
    if (window.google && window.google.accounts && window.gapi?.client?.getToken()) {
      window.google.accounts.oauth2.revoke(window.gapi.client.getToken().access_token, () => {
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
        setUser(null);
      });
    }
  }, []);

  // Google Docs functions
  const createDoc = useCallback(async (title, content) => {
    if (!gapiLoaded || !isSignedIn) {
      return null;
    }

    try {
      const createResponse = await window.gapi.client.docs.documents.create({
        resource: { title }
      });

      const docId = createResponse.result.documentId;
      const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

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

      return { docId, docUrl };
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  const syncToDoc = useCallback(async (docId, content) => {
    if (!gapiLoaded || !isSignedIn || !docId) {
      return false;
    }

    try {
      const doc = await window.gapi.client.docs.documents.get({
        documentId: docId
      });

      const endIndex = doc.result.body.content.slice(-1)[0]?.endIndex || 1;
      const requests = [];

      if (endIndex > 2) {
        requests.push({
          deleteContentRange: {
            range: { startIndex: 1, endIndex: endIndex - 1 }
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

      return true;
    } catch (error) {
      console.error('Error syncing to Google Doc:', error);
      return false;
    }
  }, [gapiLoaded, isSignedIn]);

  // Google Calendar functions
  const getCalendarEvents = useCallback(async (timeMin, timeMax) => {
    if (!gapiLoaded || !isSignedIn) {
      return [];
    }

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }, [gapiLoaded, isSignedIn]);

  const createCalendarEvent = useCallback(async (event) => {
    if (!gapiLoaded || !isSignedIn) {
      return null;
    }

    try {
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      return response.result;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  const value = {
    isSignedIn,
    gapiLoaded,
    gisLoaded,
    hasCredentials,
    user,
    signIn,
    signOut,
    createDoc,
    syncToDoc,
    getCalendarEvents,
    createCalendarEvent
  };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
}
