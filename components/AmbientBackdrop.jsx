'use client';

import { useAmbientMotionPreference } from '@/lib/useAmbientMotionPreference';
import styles from './AmbientBackdrop.module.css';

function GlassForm({ className }) {
  return <span className={`${styles.form} ${className}`} />;
}

export default function AmbientBackdrop({ variant = 'public' }) {
  const { motionAllowed, pauseReason } = useAmbientMotionPreference();

  return (
    <div
      className={`glass-ambient ${styles.backdrop}`}
      data-variant={variant === 'workspace' ? 'workspace' : 'public'}
      data-motion={motionAllowed ? 'running' : 'paused'}
      data-pause-reason={pauseReason || undefined}
      aria-hidden="true"
    >
      <div className={`${styles.layer} ${styles.canopy}`}>
        <GlassForm className={styles.formOne} />
        <GlassForm className={styles.formTwo} />
        <GlassForm className={styles.formThree} />
      </div>
      <div className={`${styles.layer} ${styles.garden}`}>
        <GlassForm className={styles.formFour} />
        <GlassForm className={styles.formFive} />
      </div>
      <div className={styles.quietZone} />
    </div>
  );
}
