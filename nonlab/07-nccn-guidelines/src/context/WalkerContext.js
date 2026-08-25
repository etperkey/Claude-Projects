import { createContext, useContext, useReducer, useCallback } from 'react';
import { getStartNodes, getNextOptions, isTerminalNode } from '../utils/walkerEngine';

const WalkerContext = createContext(null);

const initialState = {
  history: [],       // Array of { nodeId, selectedOptionIndex }
  currentNodeId: null,
  started: false,
  stopped: false,    // true when user clicks "Stop Here"
};

function walkerReducer(state, action) {
  switch (action.type) {
    case 'START': {
      return {
        ...initialState,
        currentNodeId: action.nodeId,
        started: true,
      };
    }
    case 'SELECT_OPTION': {
      return {
        ...state,
        history: [
          ...state.history,
          { nodeId: state.currentNodeId, selectedOptionIndex: action.optionIndex }
        ],
        currentNodeId: action.nextNodeId,
      };
    }
    case 'GO_BACK': {
      if (state.history.length === 0) return state;
      const newHistory = state.history.slice(0, -1);
      const previousEntry = state.history[state.history.length - 1];
      return {
        ...state,
        history: newHistory,
        currentNodeId: previousEntry.nodeId,
      };
    }
    case 'STOP': {
      return {
        ...state,
        stopped: true,
      };
    }
    case 'RESTART': {
      return { ...initialState };
    }
    default:
      return state;
  }
}

export function WalkerProvider({ children }) {
  const [state, dispatch] = useReducer(walkerReducer, initialState);

  const start = useCallback((nodeId) => {
    dispatch({ type: 'START', nodeId });
  }, []);

  const selectOption = useCallback((optionIndex, nextNodeId) => {
    dispatch({ type: 'SELECT_OPTION', optionIndex, nextNodeId });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  const stop = useCallback(() => {
    dispatch({ type: 'STOP' });
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: 'RESTART' });
  }, []);

  const value = {
    ...state,
    start,
    selectOption,
    goBack,
    stop,
    restart,
    getStartNodes,
    getNextOptions,
    isTerminalNode,
  };

  return (
    <WalkerContext.Provider value={value}>
      {children}
    </WalkerContext.Provider>
  );
}

export function useWalker() {
  const ctx = useContext(WalkerContext);
  if (!ctx) throw new Error('useWalker must be used within WalkerProvider');
  return ctx;
}
