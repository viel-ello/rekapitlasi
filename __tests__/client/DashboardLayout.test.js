import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardLayout from '@/app/dashboard/layout';

const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('@/components/Sidebar', () => function Sidebar(props) {
  return <aside id="dashboard-sidebar" data-testid="sidebar" data-mobile={String(props.isMobile)} data-open={String(props.mobileOpen)}>
    <button className="sidebar-toggle" onClick={props.onToggle}>Desktop toggle</button>
    <button onClick={props.onMobileClose}>Close drawer</button>
  </aside>;
});
jest.mock('@/components/Topbar', () => function Topbar(props) {
  return <button onClick={props.onMobileMenuToggle}>Open drawer</button>;
});
jest.mock('@/components/AiChatBubble', () => () => <button>Assistant</button>);
jest.mock('@/components/Toast', () => () => <button>Dismiss toast</button>);
jest.mock('@/components/OnboardingTour', () => () => <button>Skip tour</button>);
jest.mock('@/lib/useToast', () => ({ ToastProvider: ({ children }) => children }));

test('drawer survives ordinary resize, closes on both breakpoint crossings, and restores visible focus', async () => {
  const originalMatchMedia = window.matchMedia;
  const originalFetch = global.fetch;
  const listeners = new Set();
  const media = {
    matches: true,
    addEventListener: jest.fn((event, listener) => listeners.add(listener)),
    removeEventListener: jest.fn((event, listener) => listeners.delete(listener)),
  };
  window.matchMedia = jest.fn(() => media);
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
  localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
  let mounted;
  try {
    mounted = render(<DashboardLayout><p>Content</p></DashboardLayout>);
    const trigger = await screen.findByRole('button', { name: 'Open drawer' });
    const sidebar = screen.getByTestId('sidebar');
    trigger.focus();
    fireEvent.click(trigger);
    expect(sidebar).toHaveAttribute('data-open', 'true');
    ['Assistant', 'Dismiss toast', 'Skip tour'].forEach((name) => {
      const backgroundLayer = screen.getByText(name).closest('[data-dashboard-auxiliary]');
      expect(backgroundLayer).toHaveAttribute('inert');
      expect(backgroundLayer).toHaveAttribute('hidden');
      expect(backgroundLayer).toHaveAttribute('aria-hidden', 'true');
    });
    expect(sidebar.closest('[inert]')).toBeNull();

    fireEvent(window, new Event('resize'));
    expect(sidebar).toHaveAttribute('data-open', 'true');

    act(() => { media.matches = false; listeners.forEach((listener) => listener(media)); });
    await waitFor(() => expect(sidebar).toHaveAttribute('data-open', 'false'));
    expect(sidebar).toHaveAttribute('data-mobile', 'false');
    expect(screen.getByText('Assistant').closest('[data-dashboard-auxiliary]')).not.toHaveAttribute('inert');
    expect(screen.getByText('Assistant').closest('[data-dashboard-auxiliary]')).not.toHaveAttribute('hidden');
    expect(screen.getByRole('button', { name: 'Desktop toggle' })).toHaveFocus();

    act(() => { media.matches = true; listeners.forEach((listener) => listener(media)); });
    expect(sidebar).toHaveAttribute('data-open', 'false');
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
    expect(trigger).toHaveFocus();
  } finally {
    mounted?.unmount();
    window.matchMedia = originalMatchMedia;
    global.fetch = originalFetch;
    localStorage.removeItem('user');
  }
});
