'use client';

import { useSyncExternalStore } from 'react';

export const AMBIENT_MOTION_STORAGE_KEY = 'lumbung-ambient-motion-paused';
const serverSnapshot = Object.freeze({ userPaused: false, motionAllowed: false, systemRestricted: false, pauseReason: 'initializing' });
let snapshot = serverSnapshot;
let mediaQueries;
let cleanup;
const listeners = new Set();

function readPersistedPreference() {
  try {
    return window.localStorage.getItem(AMBIENT_MOTION_STORAGE_KEY) === '1';
  } catch {
    return snapshot.userPaused;
  }
}

function publish(userPaused = snapshot.userPaused) {
  const reducedMotion = mediaQueries?.reduced.matches ?? true;
  const smallScreen = mediaQueries?.small.matches ?? true;
  const coarsePointer = mediaQueries?.coarse.matches ?? true;
  const systemRestricted = reducedMotion || smallScreen || coarsePointer;
  const pauseReason = reducedMotion ? 'reduced-motion'
    : smallScreen ? 'small-screen'
      : coarsePointer ? 'coarse-pointer'
        : userPaused ? 'user'
          : document.hidden ? 'hidden' : null;
  const next = { userPaused, motionAllowed: !pauseReason, systemRestricted, pauseReason };
  if (Object.keys(next).every((key) => next[key] === snapshot[key])) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function startListening() {
  mediaQueries = {
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)'),
    small: window.matchMedia('(max-width: 767px)'),
    coarse: window.matchMedia('(pointer: coarse)'),
  };
  const updateEnvironment = () => publish();
  const updateStorage = (event) => {
    if (event.key === AMBIENT_MOTION_STORAGE_KEY || event.key === null) publish(readPersistedPreference());
  };
  Object.values(mediaQueries).forEach((query) => query.addEventListener('change', updateEnvironment));
  document.addEventListener('visibilitychange', updateEnvironment);
  window.addEventListener('storage', updateStorage);
  publish(readPersistedPreference());
  return () => {
    Object.values(mediaQueries).forEach((query) => query.removeEventListener('change', updateEnvironment));
    document.removeEventListener('visibilitychange', updateEnvironment);
    window.removeEventListener('storage', updateStorage);
  };
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) cleanup = startListening();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      cleanup?.();
      cleanup = undefined;
    }
  };
}

function setUserPaused(paused) {
  const next = Boolean(paused);
  try {
    window.localStorage.setItem(AMBIENT_MOTION_STORAGE_KEY, next ? '1' : '0');
  } catch {
    // Same-tab controls still share the in-memory choice when storage is blocked.
  }
  publish(next);
}

function toggleMotion() {
  setUserPaused(!snapshot.userPaused);
}

/** Shared by all controls and backdrops; storage events synchronize browser tabs. */
export function useAmbientMotionPreference() {
  const preference = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  return { ...preference, setUserPaused, toggleMotion };
}
