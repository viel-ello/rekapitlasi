/**
 * @file Unit test untuk keyboard shortcut parser & matcher
 */
const { __internal } = require('@/lib/useKeyboardShortcut');
const { normalizeShortcut, eventMatches } = __internal;

function fakeEvent({ key = '', ctrl = false, meta = false, alt = false, shift = false } = {}) {
  return {
    key,
    ctrlKey: ctrl,
    metaKey: meta,
    altKey: alt,
    shiftKey: shift,
    preventDefault: () => {},
  };
}

describe('normalizeShortcut', () => {
  test('parses "ctrl+s"', () => {
    const p = normalizeShortcut('ctrl+s');
    expect(p.key).toBe('s');
    expect(p.ctrl).toBe(true);
    expect(p.alt).toBe(false);
    expect(p.shift).toBe(false);
    expect(p.hasModifier).toBe(true);
  });

  test('parses "escape" (no modifier)', () => {
    const p = normalizeShortcut('escape');
    expect(p.key).toBe('escape');
    expect(p.ctrl).toBe(false);
    expect(p.hasModifier).toBe(false);
  });

  test('parses "alt+1"', () => {
    const p = normalizeShortcut('alt+1');
    expect(p.key).toBe('1');
    expect(p.alt).toBe(true);
  });

  test('treats cmd/command/meta as ctrl', () => {
    expect(normalizeShortcut('cmd+s').ctrl).toBe(true);
    expect(normalizeShortcut('command+s').ctrl).toBe(true);
    expect(normalizeShortcut('meta+s').ctrl).toBe(true);
  });

  test('case-insensitive', () => {
    const p = normalizeShortcut('CTRL+Shift+K');
    expect(p.key).toBe('k');
    expect(p.ctrl).toBe(true);
    expect(p.shift).toBe(true);
  });
});

describe('eventMatches', () => {
  test('Ctrl+S matches ctrl pressed with key s', () => {
    const parsed = normalizeShortcut('ctrl+s');
    expect(eventMatches(fakeEvent({ key: 's', ctrl: true }), parsed)).toBe(true);
    expect(eventMatches(fakeEvent({ key: 's', meta: true }), parsed)).toBe(true);
  });

  test('Ctrl+S does NOT match plain s', () => {
    const parsed = normalizeShortcut('ctrl+s');
    expect(eventMatches(fakeEvent({ key: 's' }), parsed)).toBe(false);
  });

  test('Escape matches without modifier', () => {
    const parsed = normalizeShortcut('escape');
    expect(eventMatches(fakeEvent({ key: 'Escape' }), parsed)).toBe(true);
    // Case-insensitive pada event key
    expect(eventMatches(fakeEvent({ key: 'escape' }), parsed)).toBe(true);
  });

  test('Escape does NOT match when shift pressed', () => {
    const parsed = normalizeShortcut('escape');
    expect(eventMatches(fakeEvent({ key: 'Escape', shift: true }), parsed)).toBe(false);
  });

  test('Alt+1 matches alt + key 1', () => {
    const parsed = normalizeShortcut('alt+1');
    expect(eventMatches(fakeEvent({ key: '1', alt: true }), parsed)).toBe(true);
    expect(eventMatches(fakeEvent({ key: '1' }), parsed)).toBe(false);
  });
});
