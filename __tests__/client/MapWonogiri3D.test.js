import React from 'react';
import { render, screen } from '@testing-library/react';
import * as framerMotion from 'framer-motion';
import MapWonogiri3D from '@/components/MapWonogiri3D';

describe('MapWonogiri3D relief illustration', () => {
  afterEach(() => jest.restoreAllMocks());

  test('exposes an accessible description and identifies itself as decorative, not cadastral', () => {
    const { container } = render(<MapWonogiri3D />);

    expect(screen.getByRole('img', { name: /Ilustrasi relief hijau Desa Belikurip/ }))
      .toHaveAccessibleDescription('Ilustrasi konsep tiga dimensi dengan hamparan hijau bertingkat untuk halaman Desa Belikurip. Bentuk dan penandanya dekoratif, bukan representasi lokasi atau batas administratif.');
    expect(container.querySelector('figcaption')).toHaveTextContent('Ilustrasi relief konsep · Desa Belikurip');
    expect(screen.queryByText(/batas desa|batas Kecamatan/i)).not.toBeInTheDocument();
  });

  test('turns off tilt motion when reduced motion is requested', () => {
    jest.spyOn(framerMotion, 'useReducedMotion').mockReturnValue(true);
    const { container } = render(<MapWonogiri3D />);
    expect(container.querySelector('figure')).toHaveAttribute('data-reduced-motion', 'true');
  });
});
