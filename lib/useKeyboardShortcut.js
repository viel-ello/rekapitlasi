'use client';

/**
 * @file Keyboard shortcut hook.
 *
 * Pemakaian:
 *   useKeyboardShortcut({
 *     'ctrl+s': saveAll,
 *     'escape': closeModal,
 *     'alt+1': () => setTab('users'),
 *   }, { enabled: canEdit });
 *
 * Ketentuan:
 * - 'ctrl' akan match ctrlKey || metaKey (Windows dan Mac).
 * - Abaikan event saat fokus di <input>/<textarea>/[contenteditable] KECUALI shortcut
 *   termasuk modifier (ctrl/alt/meta/shift) — supaya Ctrl+S tetap jalan saat mengetik.
 * - preventDefault() di-panggil otomatis saat handler match.
 */

import { useEffect, useRef } from 'react';

const MODIFIER_ALIASES = {
  ctrl: 'ctrl',
  control: 'ctrl',
  cmd: 'ctrl',
  command: 'ctrl',
  meta: 'ctrl',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
};

function normalizeShortcut(combo) {
  const parts = String(combo).toLowerCase().split('+').map((p) => p.trim()).filter(Boolean);
  const modifiers = new Set();
  let key = '';
  for (const p of parts) {
    if (MODIFIER_ALIASES[p]) modifiers.add(MODIFIER_ALIASES[p]);
    else key = p;
  }
  return {
    key,
    ctrl: modifiers.has('ctrl'),
    alt: modifiers.has('alt'),
    shift: modifiers.has('shift'),
    hasModifier: modifiers.size > 0,
  };
}

function eventMatches(e, parsed) {
  const eKey = (e.key || '').toLowerCase();
  if (eKey !== parsed.key) return false;
  const eCtrl = e.ctrlKey || e.metaKey;
  if (Boolean(parsed.ctrl) !== Boolean(eCtrl)) return false;
  if (Boolean(parsed.alt) !== Boolean(e.altKey)) return false;
  if (Boolean(parsed.shift) !== Boolean(e.shiftKey)) return false;
  return true;
}

function isEditableTarget(target) {
  if (!target) return false;
  const tag = (target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * @param {Record<string, () => void>} keyMap
 * @param {{ enabled?: boolean }} [opts]
 */
export function useKeyboardShortcut(keyMap, opts = {}) {
  const enabled = opts.enabled !== false;
  const mapRef = useRef(keyMap);
  mapRef.current = keyMap;

  useEffect(() => {
    if (!enabled) return;

    const handlers = Object.entries(mapRef.current || {}).map(([combo, handler]) => ({
      combo,
      parsed: normalizeShortcut(combo),
      handler,
    }));

    if (handlers.length === 0) return;

    const onKeyDown = (e) => {
      for (const { parsed, handler } of handlers) {
        if (!eventMatches(e, parsed)) continue;
        // Abaikan saat mengetik di input/textarea kecuali ada modifier
        if (!parsed.hasModifier && isEditableTarget(e.target)) continue;
        e.preventDefault();
        handler(e);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}

// Exposed untuk unit test
export const __internal = { normalizeShortcut, eventMatches };
