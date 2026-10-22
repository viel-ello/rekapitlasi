/**
 * @file Test Button component: variants, sizes, disabled state, ref forwarding, and asChild.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  test('render button default dengan teks dan kelas primary', () => {
    render(<Button>Simpan</Button>);
    const btn = screen.getByRole('button', { name: 'Simpan' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('bg-primary-600');
  });

  test('mendukung berbagai variant tombol', () => {
    const { rerender } = render(<Button variant="danger">Hapus</Button>);
    expect(screen.getByRole('button', { name: 'Hapus' })).toHaveClass('bg-red-600');

    rerender(<Button variant="secondary">Batal</Button>);
    expect(screen.getByRole('button', { name: 'Batal' })).toHaveClass('bg-white');

    rerender(<Button variant="outline">Detail</Button>);
    expect(screen.getByRole('button', { name: 'Detail' })).toHaveClass('border-primary-200');

    rerender(<Button variant="ghost">Menu</Button>);
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass('text-gray-600');
  });

  test('mendukung berbagai ukuran size', () => {
    const { rerender } = render(<Button size="sm">Kecil</Button>);
    expect(screen.getByRole('button', { name: 'Kecil' })).toHaveClass('h-8');

    rerender(<Button size="lg">Besar</Button>);
    expect(screen.getByRole('button', { name: 'Besar' })).toHaveClass('h-11');

    rerender(<Button size="icon" aria-label="Icon Btn">X</Button>);
    expect(screen.getByRole('button', { name: 'Icon Btn' })).toHaveClass('w-10');
  });

  test('memanggil onClick handler saat diklik', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Klik Saya</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Klik Saya' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('tidak memanggil onClick dan memiliki disabled attribute saat disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Nonaktif</Button>);
    const btn = screen.getByRole('button', { name: 'Nonaktif' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('meneruskan ref ke elemen DOM tombol (forwardRef)', () => {
    const ref = React.createRef();
    render(<Button ref={ref}>Ref Target</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current.textContent).toBe('Ref Target');
  });

  test('mendukung asChild menggunakan Slot', () => {
    render(
      <Button asChild>
        <a href="/dashboard">Link Tombol</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Link Tombol' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(link).toHaveClass('bg-primary-600');
  });
});
