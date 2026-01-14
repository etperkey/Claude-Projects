import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';

const GoogleAuthContext = createContext(null);

export function GoogleAuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [user, setUser] = useState(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const hasCredentials = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);

  // Check if user dismissed the prompt this session
  const [promptDismissed, setPromptDismissed] = useState(() => {
    return sessionStorage.getItem('google-signin-dismissed') === 'true';
  });

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
        window.gapi.load('client:picker', () => {
          initGapi();
          setPickerLoaded(true);
        });
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
            'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
            'https://sheets.googleapis.com/$discovery/rest?version=v4'
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
          scope: 'openid profile email https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setIsSignedIn(true);
              setShowSignInPrompt(false);
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

  // Show sign-in prompt when GIS is loaded and user is not signed in
  useEffect(() => {
    if (gisLoaded && hasCredentials && !isSignedIn && !promptDismissed) {
      // Small delay to let the app render first
      const timer = setTimeout(() => {
        setShowSignInPrompt(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gisLoaded, hasCredentials, isSignedIn, promptDismissed]);

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

  const dismissPrompt = useCallback(() => {
    setShowSignInPrompt(false);
    setPromptDismissed(true);
    sessionStorage.setItem('google-signin-dismissed', 'true');
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

  // Import content from a Google Doc
  const importFromDoc = useCallback(async (docId) => {
    if (!gapiLoaded || !isSignedIn || !docId) {
      return null;
    }

    try {
      const doc = await window.gapi.client.docs.documents.get({
        documentId: docId
      });

      // Extract plain text from the document
      let textContent = '';
      const content = doc.result.body.content;

      for (const element of content) {
        if (element.paragraph) {
          for (const textRun of element.paragraph.elements || []) {
            if (textRun.textRun && textRun.textRun.content) {
              textContent += textRun.textRun.content;
            }
          }
        }
      }

      return {
        title: doc.result.title,
        content: textContent.trim()
      };
    } catch (error) {
      console.error('Error importing from Google Doc:', error);
      return null;
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

  // Google Sheets functions
  const createSheet = useCallback(async (title, headers = [], data = []) => {
    if (!gapiLoaded || !isSignedIn) {
      return null;
    }

    try {
      // Create the spreadsheet
      const createResponse = await window.gapi.client.sheets.spreadsheets.create({
        resource: {
          properties: { title },
          sheets: [{
            properties: { title: 'Sheet1' }
          }]
        }
      });

      const spreadsheetId = createResponse.result.spreadsheetId;
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // Add headers and data if provided
      if (headers.length > 0 || data.length > 0) {
        const values = [];
        if (headers.length > 0) {
          values.push(headers);
        }
        if (data.length > 0) {
          values.push(...data);
        }

        if (values.length > 0) {
          await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'RAW',
            resource: { values }
          });
        }
      }

      return { spreadsheetId, sheetUrl };
    } catch (error) {
      console.error('Error creating Google Sheet:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  const syncToSheet = useCallback(async (spreadsheetId, headers, data) => {
    if (!gapiLoaded || !isSignedIn || !spreadsheetId) {
      return false;
    }

    try {
      // Clear existing data
      await window.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Sheet1'
      });

      // Write new data
      const values = [headers, ...data];
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        resource: { values }
      });

      return true;
    } catch (error) {
      console.error('Error syncing to Google Sheet:', error);
      return false;
    }
  }, [gapiLoaded, isSignedIn]);

  const importFromSheet = useCallback(async (spreadsheetId) => {
    if (!gapiLoaded || !isSignedIn || !spreadsheetId) {
      return null;
    }

    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1'
      });

      const values = response.result.values || [];
      const headers = values[0] || [];
      const data = values.slice(1);

      return { headers, data };
    } catch (error) {
      console.error('Error importing from Google Sheet:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  // Upload file to Google Drive
  const uploadFileToDrive = useCallback(async (file, folderId = null) => {
    if (!gapiLoaded || !isSignedIn) {
      return null;
    }

    try {
      const metadata = {
        name: file.name,
        mimeType: file.type
      };

      if (folderId) {
        metadata.parents = [folderId];
      }

      // Create form data for multipart upload
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const token = window.gapi.client.getToken();
      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink,iconLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.access_token}`
          },
          body: form
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        id: result.id,
        name: result.name,
        mimeType: result.mimeType,
        webViewLink: result.webViewLink,
        webContentLink: result.webContentLink,
        thumbnailLink: result.thumbnailLink,
        iconLink: result.iconLink
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  // Open Google Drive file picker
  const openFilePicker = useCallback((options = {}) => {
    return new Promise((resolve, reject) => {
      if (!pickerLoaded || !isSignedIn) {
        reject(new Error('Picker not available or not signed in'));
        return;
      }

      const token = window.gapi.client.getToken();
      if (!token) {
        reject(new Error('No access token available'));
        return;
      }

      const {
        multiSelect = false,
        mimeTypes = null, // e.g., ['application/pdf', 'image/*']
        viewId = 'DOCS' // DOCS, DOCS_IMAGES, DOCS_VIDEOS, SPREADSHEETS, etc.
      } = options;

      try {
        let view;
        if (mimeTypes && mimeTypes.length > 0) {
          view = new window.google.picker.DocsView()
            .setMimeTypes(mimeTypes.join(','))
            .setIncludeFolders(false);
        } else if (viewId === 'PDFS') {
          view = new window.google.picker.DocsView()
            .setMimeTypes('application/pdf')
            .setIncludeFolders(false);
        } else {
          view = new window.google.picker.DocsView(window.google.picker.ViewId[viewId] || window.google.picker.ViewId.DOCS)
            .setIncludeFolders(false);
        }

        const picker = new window.google.picker.PickerBuilder()
          .addView(view)
          .addView(new window.google.picker.DocsUploadView())
          .setOAuthToken(token.access_token)
          .setDeveloperKey(GOOGLE_API_KEY)
          .setCallback((data) => {
            if (data.action === window.google.picker.Action.PICKED) {
              const files = data.docs.map(doc => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                url: doc.url,
                iconUrl: doc.iconUrl,
                embedUrl: doc.embedUrl
              }));
              resolve(multiSelect ? files : files[0]);
            } else if (data.action === window.google.picker.Action.CANCEL) {
              resolve(null);
            }
          });

        if (multiSelect) {
          picker.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
        }

        picker.build().setVisible(true);
      } catch (error) {
        console.error('Error opening file picker:', error);
        reject(error);
      }
    });
  }, [pickerLoaded, isSignedIn]);

  // Get file info from Google Drive
  const getFileInfo = useCallback(async (fileId) => {
    if (!gapiLoaded || !isSignedIn) {
      return null;
    }

    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,webViewLink,webContentLink,thumbnailLink,iconLink,size'
      });

      return response.result;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  const value = {
    isSignedIn,
    gapiLoaded,
    gisLoaded,
    pickerLoaded,
    hasCredentials,
    user,
    showSignInPrompt,
    signIn,
    signOut,
    dismissPrompt,
    createDoc,
    syncToDoc,
    importFromDoc,
    createSheet,
    syncToSheet,
    importFromSheet,
    getCalendarEvents,
    createCalendarEvent,
    uploadFileToDrive,
    openFilePicker,
    getFileInfo
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
