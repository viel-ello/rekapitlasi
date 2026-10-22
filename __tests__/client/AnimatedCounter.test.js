import React from 'react';
import { render, screen, act } from '@testing-library/react';
import AnimatedCounter from '@/components/AnimatedCounter';
import UiAnimatedCounter, { AnimatedCounter as NamedUiAnimatedCounter } from '@/components/ui/AnimatedCounter';
import * as framerMotion from 'framer-motion';

describe('AnimatedCounter Component', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('render nilai angka awal dan target', () => {
    render(<AnimatedCounter value={1250} start={1250} />);
    expect(screen.getByText('1.250')).toBeInTheDocument();
  });

  test('render dengan prefix dan suffix', () => {
    render(
      <AnimatedCounter
        value={42}
        start={42}
        prefix="Total: "
        suffix=" Dusun"
      />
    );
    expect(screen.getByText('Total: 42 Dusun')).toBeInTheDocument();
  });

  test('render dengan formatLocale=false sebagai string mentah', () => {
    render(
      <AnimatedCounter
        value={15000}
        start={15000}
        formatLocale={false}
      />
    );
    expect(screen.getByText('15000')).toBeInTheDocument();
  });

  test('render sebagai elemen kustom (as prop)', () => {
    const { container } = render(
      <AnimatedCounter
        value={99}
        start={99}
        as="h3"
        className="kpi-heading"
      />
    );
    const heading = container.querySelector('h3.kpi-heading');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('99');
  });

  test('menangani nilai NaN, null, dan non-finite dengan aman (fallback 0)', () => {
    render(<AnimatedCounter value="invalid" start={null} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('segera menampilkan nilai akhir saat prefers-reduced-motion aktif', () => {
    jest.spyOn(framerMotion, 'useReducedMotion').mockReturnValue(true);

    render(
      <AnimatedCounter
        value={9876}
        start={0}
      />
    );

    // Saat reduced motion aktif, target langsung ditampilkan tanpa transisi animasi
    expect(screen.getByText('9.876')).toBeInTheDocument();
  });

  test('components/ui/AnimatedCounter.jsx re-export komponen dengan benar', () => {
    expect(UiAnimatedCounter).toBe(AnimatedCounter);
    expect(NamedUiAnimatedCounter).toBe(AnimatedCounter);

    render(<UiAnimatedCounter value={77} start={77} />);
    expect(screen.getByText('77')).toBeInTheDocument();
  });
});
