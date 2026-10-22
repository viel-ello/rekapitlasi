/**
 * @file Test Sidebar: expanded/collapsed state, smooth transitions, active indicator, roles.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';

// Mock next/navigation
const mockPathname = jest.fn(() => '/dashboard');
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className, title, onClick, 'aria-label': ariaLabel }) => (
    <a href={href} className={className} title={title} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </a>
  );
});

describe('Sidebar', () => {
  const adminUser = { username: 'admin', nama_lengkap: 'Administrator', role: 'admin' };
  const kaderUser = { username: 'kader1', nama_lengkap: 'Kader Soko', role: 'dusun_soko' };

  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
    jest.clearAllMocks();
  });

  test('render sidebar expanded: logo, brand text, menu items, active indicator', () => {
    render(
      <Sidebar
        user={adminUser}
        collapsed={false}
        onToggle={jest.fn()}
        onLogout={jest.fn()}
      />
    );

    // Brand elements
    expect(screen.getByAltText('Logo')).toBeInTheDocument();
    expect(screen.getByText('Lumbung PKK')).toBeInTheDocument();
    expect(screen.getByText('Desa Belikurip')).toBeInTheDocument();
    expect(screen.getByLabelText('Tutup sidebar')).toBeInTheDocument();

    // Menu item Dashboard is active
    const dashboardLink = screen.getByLabelText(/^Dashboard/);
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveClass('nav-item-active');

    // Other items are rendered and not active
    const dataUmumLink = screen.getByLabelText(/^Data Umum/);
    expect(dataUmumLink).toBeInTheDocument();
    expect(dataUmumLink).not.toHaveClass('nav-item-active');

    // Admin section is present for admin user
    expect(screen.getByText('Administrasi')).toBeInTheDocument();
    expect(screen.getByText('Panel Admin')).toBeInTheDocument();

    // User profile and actions
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Ganti Password')).toBeInTheDocument();
    expect(screen.getByText('Keluar')).toBeInTheDocument();
  });

  test('render sidebar collapsed: sidebar-collapsed class, tooltips on items, centered avatar', () => {
    const handleToggle = jest.fn();
    const { container } = render(
      <Sidebar
        user={kaderUser}
        collapsed={true}
        onToggle={handleToggle}
        onLogout={jest.fn()}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('sidebar-collapsed');

    // Toggle button aria-label flips to "Buka sidebar"
    const toggleBtn = screen.getByLabelText('Buka sidebar');
    expect(toggleBtn).toBeInTheDocument();

    // Clicking toggle button calls onToggle
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    // Clicking brand area calls onToggle when collapsed
    const brandArea = container.querySelector('.sidebar-brand');
    expect(brandArea).toHaveAttribute('aria-expanded', 'false');
    expect(brandArea).toHaveAttribute('aria-controls', 'dashboard-sidebar');
    expect(container.querySelector('.sidebar-toggle')).toHaveAttribute('tabindex', '-1');
    expect(container.querySelector('.sidebar-toggle')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(brandArea);
    expect(handleToggle).toHaveBeenCalledTimes(2);

    // Items retain text inside DOM (.nav-text) for CSS transition without React unmounting
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Tooltips (title attribute) are set on items in collapsed state
    const dashboardLink = screen.getByLabelText(/^Dashboard/);
    expect(dashboardLink).toHaveAttribute('title', 'Dashboard');

    // User card has tooltip with user details
    const userCard = container.querySelector('.sidebar-user-card');
    expect(userCard).toHaveAttribute('title', 'Kader Soko (dusun_soko)');

    // Admin section is NOT present for kader role
    expect(screen.queryByText('Administrasi')).not.toBeInTheDocument();
  });

  test('symmetrical active indicator and persistent structure across states', () => {
    mockPathname.mockReturnValue('/dashboard/pokja1');
    const { container, rerender } = render(
      <Sidebar
        user={adminUser}
        collapsed={false}
        onToggle={jest.fn()}
        onLogout={jest.fn()}
      />
    );

    // Pokja 1 is active with sub-label
    const pokjaLink = screen.getByLabelText(/^Pokja I\b/);
    expect(pokjaLink).toHaveClass('nav-item-active');
    expect(pokjaLink.querySelector('.nav-icon')).toBeInTheDocument();
    expect(pokjaLink.querySelector('.nav-text')).toBeInTheDocument();
    expect(screen.getByText('Pancasila & Gotong Royong')).toBeInTheDocument();

    // Rerender collapsed
    rerender(
      <Sidebar
        user={adminUser}
        collapsed={true}
        onToggle={jest.fn()}
        onLogout={jest.fn()}
      />
    );

    // In collapsed state, element remains active and title has full label + sub
    expect(pokjaLink).toHaveClass('nav-item-active');
    expect(pokjaLink).toHaveAttribute('title', 'Pokja I — Pancasila & Gotong Royong');
    // Nav text remains in DOM for CSS transition
    expect(screen.getByText('Pokja I')).toBeInTheDocument();
    expect(screen.getByText('Pancasila & Gotong Royong')).toBeInTheDocument();
  });

  test('mobile interaction: mobileOpen class and closing handler', () => {
    const handleMobileClose = jest.fn();
    const { container } = render(
      <Sidebar
        user={adminUser}
        collapsed={false}
        mobileOpen={true}
        isMobile={true}
        onToggle={jest.fn()}
        onMobileClose={handleMobileClose}
        onLogout={jest.fn()}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('sidebar-mobile-open');
    expect(aside).toHaveAttribute('role', 'dialog');
    expect(aside).toHaveAttribute('aria-modal', 'true');

    // Clicking toggle button closes mobile drawer
    const toggleBtn = screen.getByLabelText('Tutup sidebar');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(toggleBtn).toHaveAttribute('aria-controls', 'dashboard-sidebar');
    fireEvent.click(toggleBtn);
    expect(handleMobileClose).toHaveBeenCalledTimes(1);
  });

  test('mobile drawer closes on Escape and route selection', () => {
    const handleMobileClose = jest.fn();
    const { container } = render(
      <Sidebar user={adminUser} collapsed={false} mobileOpen isMobile onToggle={jest.fn()}
        onMobileClose={handleMobileClose} onLogout={jest.fn()} />
    );
    const aside = container.querySelector('aside');

    fireEvent.keyDown(aside, { key: 'Escape' });
    expect(handleMobileClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/^Data Umum/));
    expect(handleMobileClose).toHaveBeenCalledTimes(2);
  });

  test('mobile closed drawer is hidden from keyboard and assistive technology', () => {
    const { container } = render(
      <Sidebar user={adminUser} collapsed={false} mobileOpen={false} isMobile
        onToggle={jest.fn()} onMobileClose={jest.fn()} onLogout={jest.fn()} />
    );
    const aside = container.querySelector('aside');
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(aside).toHaveAttribute('inert');
  });

  test('rapid collapse changes preserve the same menu rows and icons', () => {
    mockPathname.mockReturnValue('/dashboard/pokja1/edit');
    const props = { user: adminUser, onToggle: jest.fn(), onLogout: jest.fn() };
    const { container, rerender } = render(<Sidebar {...props} collapsed={false} />);
    const rows = [...container.querySelectorAll('.sidebar-nav .nav-item')];
    const icons = rows.map((row) => row.querySelector('.nav-icon'));
    const groups = [...container.querySelectorAll('.sidebar-nav-group')];

    for (let toggle = 1; toggle <= 10; toggle += 1) {
      rerender(<Sidebar {...props} collapsed={toggle % 2 === 1} />);
      const currentRows = [...container.querySelectorAll('.sidebar-nav .nav-item')];
      expect(currentRows).toHaveLength(rows.length);
      currentRows.forEach((row, index) => {
        expect(row).toBe(rows[index]);
        expect(row.querySelector('.nav-icon')).toBe(icons[index]);
      });
      expect([...container.querySelectorAll('.sidebar-nav-group')]).toEqual(groups);
      expect(screen.getByLabelText(/^Pokja I\b/)).toHaveClass('nav-item-active');
    }

    expect(container.querySelector('aside')).not.toHaveClass('sidebar-collapsed');
    // Real browser measurements, rather than JSDOM, verify the icon positions.
  });
});

