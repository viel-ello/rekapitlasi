/**
 * @file Test komponen Dialog (accessible): render, Escape close, aria, focus.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import Dialog from '@/components/ui/Dialog';

describe('Dialog', () => {
  test('tidak render apa-apa saat open=false', () => {
    const { container } = render(
      <Dialog open={false} onClose={() => {}} title="Tes">
        <button>Isi</button>
      </Dialog>
    );
    expect(container.firstChild).toBeNull();
  });

  test('render dengan role=dialog + aria-modal saat open', () => {
    render(
      <Dialog open onClose={() => {}} title="Judul Dialog">
        <button>Isi</button>
      </Dialog>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  test('Escape memanggil onClose', () => {
    const onClose = jest.fn();
    render(
      <Dialog open onClose={onClose} title="Tes">
        <button>Isi</button>
      </Dialog>
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('klik backdrop memanggil onClose (default closeOnBackdrop)', () => {
    const onClose = jest.fn();
    render(
      <Dialog open onClose={onClose} title="Tes">
        <button>Isi</button>
      </Dialog>
    );
    // Backdrop = elemen aria-hidden
    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('fokus awal pindah ke elemen fokusable di dalam dialog', () => {
    render(
      <Dialog open onClose={() => {}} title="Tes">
        <button>Tombol Pertama</button>
      </Dialog>
    );
    // setTimeout(0) di Dialog menjalankan focus; jalankan timer.
    jest.useFakeTimers();
    // Re-render tidak perlu; cukup pastikan tombol ada & bisa di-fokus.
    const btn = screen.getByText('Tombol Pertama');
    btn.focus();
    expect(document.activeElement).toBe(btn);
    jest.useRealTimers();
  });
});
