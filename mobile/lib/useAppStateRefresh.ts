import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useAppStateRefresh(callback: () => void) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        callback();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [callback]);
}
