/**
 * @file Test Topbar: dropdown profil open-close + Escape.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Topbar from '@/components/Topbar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock useTheme
jest.mock('@/lib/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

beforeEach(() => {
  // Mock fetch untuk notifications
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], unreadCount: 0 }) })
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

const user = { username: 'admin', nama_lengkap: 'Administrator', role: 'admin' };

describe('Topbar', () => {
  test('render tombol notifikasi & profil', () => {
    render(<Topbar user={user} onMobileMenuToggle={() => {}} />);
    expect(screen.getByLabelText(/Notifikasi/)).toBeInTheDocument();
    expect(screen.getByLabelText('Menu profil')).toBeInTheDocument();
  });

  test('dropdown profil terbuka saat diklik lalu tertutup dengan Escape', async () => {
    render(<Topbar user={user} onMobileMenuToggle={() => {}} />);
    const profileBtn = screen.getByLabelText('Menu profil');

    // Awal: tertutup
    expect(profileBtn).toHaveAttribute('aria-expanded', 'false');

    // Buka
    fireEvent.click(profileBtn);
    expect(profileBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Profil Saya')).toBeInTheDocument();

    // Escape menutup
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(profileBtn).toHaveAttribute('aria-expanded', 'false'));
  });

  test('tombol notifikasi punya aria-haspopup', () => {
    render(<Topbar user={user} onMobileMenuToggle={() => {}} />);
    expect(screen.getByLabelText(/Notifikasi/)).toHaveAttribute('aria-haspopup', 'true');
  });

  test('dropdown notifikasi terbuka saat diklik dan tertutup dengan Escape', async () => {
    render(<Topbar user={user} onMobileMenuToggle={() => {}} />);
    const notifBtn = screen.getByLabelText(/Notifikasi/);

    expect(notifBtn).toHaveAttribute('aria-expanded', 'false');

    // Buka
    fireEvent.click(notifBtn);
    expect(notifBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Belum ada notifikasi')).toBeInTheDocument();

    // Escape menutup
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(notifBtn).toHaveAttribute('aria-expanded', 'false'));
  });

  test('menutup dropdown profil saat klik di luar (click-outside)', async () => {
    render(
      <div>
        <div data-testid="outside-element">Luar</div>
        <Topbar user={user} onMobileMenuToggle={() => {}} />
      </div>
    );
    const profileBtn = screen.getByLabelText('Menu profil');

    fireEvent.click(profileBtn);
    expect(profileBtn).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(screen.getByTestId('outside-element'));
    await waitFor(() => expect(profileBtn).toHaveAttribute('aria-expanded', 'false'));
  });

  test('memanggil onMobileMenuToggle saat tombol mobile menu diklik', () => {
    const onMobileMenuToggle = jest.fn();
    render(<Topbar user={user} onMobileMenuToggle={onMobileMenuToggle} />);
    const mobileBtn = screen.getByLabelText('Buka menu');

    fireEvent.click(mobileBtn);
    expect(onMobileMenuToggle).toHaveBeenCalledTimes(1);
  });
});
