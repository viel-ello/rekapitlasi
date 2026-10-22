'use client';

import { useAmbientMotionPreference } from '@/lib/useAmbientMotionPreference';
import styles from './AmbientBackdrop.module.css';

const restrictionLabels = {
  'reduced-motion': 'Latar statis mengikuti pengaturan kurangi gerakan perangkat.',
  'small-screen': 'Latar statis pada layar kecil.',
  'coarse-pointer': 'Latar statis pada perangkat sentuh.',
  initializing: 'Menyiapkan pengaturan gerak latar.',
};

/** compact shows only the icon; className lets each surface place the control. */
export default function AmbientMotionToggle({ className = '', compact = false }) {
  const { userPaused, systemRestricted, pauseReason, toggleMotion } = useAmbientMotionPreference();
  const restricted = systemRestricted || pauseReason === 'initializing';
  const label = restricted ? 'Latar statis' : userPaused ? 'Lanjutkan gerak latar' : 'Jeda gerak latar';

  return (
    <button
      type="button"
      onClick={toggleMotion}
      disabled={restricted}
      aria-label={label}
      aria-pressed={restricted || userPaused}
      title={restrictionLabels[pauseReason] || label}
      className={`${styles.toggle} ${compact ? styles.compactToggle : ''} ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        {userPaused && !restricted
          ? <path d="m7 4 8 6-8 6V4Z" fill="currentColor" />
          : <><rect x="5" y="4" width="3" height="12" rx="1" fill="currentColor" /><rect x="12" y="4" width="3" height="12" rx="1" fill="currentColor" /></>}
      </svg>
      {!compact && <span>{label}</span>}
    </button>
  );
}
