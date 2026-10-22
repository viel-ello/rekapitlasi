/**
 * @file Stress & Interactive State Verification Test Suite (Challenger 1 - M5)
 *
 * Adversarial stress testing for:
 * 1. SteppedForm.jsx:
 *    - Rapid step transitions (spamming next/prev, direct step jumps)
 *    - Required field validation bounds under rapid input
 *    - Direction state consistency and variant calculations
 *    - Keyboard shortcuts (Alt+ArrowLeft/Right, Escape)
 *    - Edge cases: 0 steps, 1 step, boundary jumps, rapid initialData sync
 *    - Bug confirmation: unbounded step index overflow (spamming Next)
 *    - Bug confirmation: default parameter initialData = {} infinite loop
 * 2. Dialog.jsx:
 *    - Rapid mount/unmount and toggling (body overflow leak checks)
 *    - Focus trap cycle and focus restoration
 *    - Escape key propagation and rapid triggering
 *    - Backdrop click isolation and closeOnBackdrop toggle
 *    - Bug confirmation: focus trap fragility when offsetParent is null
 * 3. layoutId Sliding Indicators (DashboardToolbar, Sidebar, FormProgressBar):
 *    - Rapid tab switching with layoutId
 *    - Verification of zero duplicate active pills or orphan nodes
 *    - Empty filter arrays and route changes
 *    - Bug confirmation: Sidebar crash on null pathname (Next.js fallback)
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Dialog from '@/components/ui/Dialog';
import SteppedForm from '@/components/ui/SteppedForm';
import FormProgressBar from '@/components/ui/FormProgressBar';
import Sidebar from '@/components/Sidebar';
import DashboardToolbar from '@/components/DashboardToolbar';

// Mock next/navigation for Sidebar
const mockPathname = jest.fn(() => '/dashboard');
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className, title, 'aria-label': ariaLabel }) => (
    <a href={href} className={className} title={title} aria-label={ariaLabel}>
      {children}
    </a>
  );
});

describe('STRESS TEST 1: SteppedForm Rapid Step Transitions & Directional States', () => {
  const sampleSteps = [
    {
      id: 'step-1',
      title: 'Langkah 1 - Identitas',
      description: 'Isi data identitas kader',
      fields: [
        { key: 'nama_kader', label: 'Nama Kader', required: true },
        { key: 'telepon', label: 'Nomor Telepon', required: false },
      ],
    },
    {
      id: 'step-2',
      title: 'Langkah 2 - Statistik',
      description: 'Statistik kegiatan',
      fields: [
        { key: 'jml_warga', label: 'Jumlah Warga', required: true },
        { key: 'keterangan', label: 'Keterangan', type: 'text' },
      ],
    },
    {
      id: 'step-3',
      title: 'Langkah 3 - Logistik',
      description: 'Data logistik',
      fields: [
        { key: 'stok_buku', label: 'Stok Buku', required: false },
      ],
    },
  ];

  test('Controlled step transitions advance to review step correctly', () => {
    render(
      <SteppedForm
        isOpen={true}
        onClose={jest.fn()}
        title="Controlled Form Test"
        steps={sampleSteps}
        initialData={{ nama_kader: 'Kader A', jml_warga: '100' }}
      />
    );

    // Initial state: Step 1 (Bagian 1)
    expect(screen.getByText('Bagian 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Langkah 1 - Identitas' })).toBeInTheDocument();

    // Step 1 -> 2
    fireEvent.click(screen.getByText('Lanjut'));
    expect(screen.getByRole('heading', { name: 'Langkah 2 - Statistik' })).toBeInTheDocument();

    // Step 2 -> 3
    fireEvent.click(screen.getByText('Lanjut'));
    expect(screen.getByRole('heading', { name: 'Langkah 3 - Logistik' })).toBeInTheDocument();

    // Step 3 -> Review
    fireEvent.click(screen.getByText('Lanjut'));
    expect(screen.getByText('Ringkasan & Verifikasi')).toBeInTheDocument();
    expect(screen.getByText('Simpan Data')).toBeInTheDocument();

    // Review step has no 'Lanjut' button
    expect(screen.queryByText('Lanjut')).not.toBeInTheDocument();
  });

  test('REMEDIATED: Rapid Next spamming is clamped and does not overflow totalSteps', () => {
    render(
      <SteppedForm
        isOpen={true}
        onClose={jest.fn()}
        title="Spamming Next Test"
        steps={sampleSteps}
        initialData={{ nama_kader: 'Kader A', jml_warga: '100' }}
      />
    );

    const nextBtn = screen.getByText('Lanjut');

    // Rapid spamming Next: 20 rapid clicks within single batch
    act(() => {
      for (let i = 0; i < 20; i++) {
        fireEvent.click(nextBtn);
      }
    });

    // Clamped functional updater ensures currentStep reaches exactly totalSteps - 1 (review step)
    // and does NOT overshoot totalSteps (4)
    expect(screen.getByText(/Langkah 4 dari 4/)).toBeInTheDocument();
    expect(screen.getByText(/100% Selesai/)).toBeInTheDocument();
    expect(screen.getByText('Simpan Data')).toBeInTheDocument();
    expect(screen.queryByText(/525% Selesai/)).not.toBeInTheDocument();
  });

  test('REMEDIATED: Parent re-render with new initialData reference preserves currentStep', () => {
    function ParentComponent() {
      const [, setCounter] = useState(0);
      return (
        <div>
          <button id="parent-update-btn" onClick={() => setCounter((c) => c + 1)}>
            Trigger Parent Update
          </button>
          <SteppedForm
            isOpen={true}
            onClose={() => {}}
            title="Parent Form Test"
            steps={sampleSteps}
            initialData={{ nama_kader: 'Kader A', jml_warga: '100' }}
          />
        </div>
      );
    }

    render(<ParentComponent />);

    // Advance to Step 2
    fireEvent.click(screen.getByText('Lanjut'));
    expect(screen.getByRole('heading', { name: 'Langkah 2 - Statistik' })).toBeInTheDocument();
    expect(screen.getByText('Bagian 2')).toBeInTheDocument();

    // Parent re-renders (creates new initialData object reference in JSX)
    fireEvent.click(screen.getByText('Trigger Parent Update'));

    // SteppedForm preserves in-progress currentStep and does NOT reset to step 0
    expect(screen.getByRole('heading', { name: 'Langkah 2 - Statistik' })).toBeInTheDocument();
    expect(screen.getByText('Bagian 2')).toBeInTheDocument();
    expect(screen.getByText('Langkah 2 dari 4')).toBeInTheDocument();
  });

  test('Rapid Next spamming is blocked when required fields are empty', () => {
    render(
      <SteppedForm
        isOpen={true}
        onClose={jest.fn()}
        title="Formulir Pokja Validation Test"
        steps={sampleSteps}
        initialData={{ nama_kader: '', jml_warga: '' }}
      />
    );

    const nextBtn = screen.getByText('Lanjut');

    // Spam click Next 10 times while required field is empty
    act(() => {
      for (let i = 0; i < 10; i++) {
        fireEvent.click(nextBtn);
      }
    });

    // Must remain on Step 1 (Bagian 1) with error
    expect(screen.getByText('Bagian 1')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Nama Kader wajib diisi');

    // Now type a value and ensure error clears
    const input = screen.getByLabelText(/Nama Kader/i);
    fireEvent.change(input, { target: { value: 'Budi' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Now click Next -> moves to Step 2
    fireEvent.click(screen.getByText('Lanjut'));
    expect(screen.getByText('Bagian 2')).toBeInTheDocument();
  });

  test('Direct step jumps via FormProgressBar maintain directional consistency and bounds', () => {
    render(
      <SteppedForm
        isOpen={true}
        onClose={jest.fn()}
        title="Direct Step Jumps Test"
        steps={sampleSteps}
        initialData={{ nama_kader: 'Siti', jml_warga: '50' }}
      />
    );

    // Progress to Step 3 so prior steps are completed and clickable
    fireEvent.click(screen.getByText('Lanjut')); // to step 2
    fireEvent.click(screen.getByText('Lanjut')); // to step 3

    expect(screen.getByText('Bagian 3')).toBeInTheDocument();

    // Click on Step 1 pill directly (backward jump: index 0)
    const step1Pill = screen.getByTitle('Langkah 1 - Identitas');
    fireEvent.click(step1Pill);
    expect(screen.getByText('Bagian 1')).toBeInTheDocument();

    // Forward steps are guarded (disabled for idx > currentStep)
    const step3Pill = screen.getByTitle('Langkah 3 - Logistik');
    expect(step3Pill).toBeDisabled();
  });

  test('Keyboard navigation: Alt+ArrowRight / Alt+ArrowLeft and Escape', () => {
    const handleClose = jest.fn();
    render(
      <SteppedForm
        isOpen={true}
        onClose={handleClose}
        title="Keyboard Nav Test"
        steps={sampleSteps}
        initialData={{ nama_kader: 'Ahmad', jml_warga: '20' }}
      />
    );

    // Alt + ArrowRight -> next step
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true });
    expect(screen.getByText('Bagian 2')).toBeInTheDocument();

    // Alt + ArrowLeft -> prev step
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    expect(screen.getByText('Bagian 1')).toBeInTheDocument();

    // Escape -> triggers onClose
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('Keyboard events ignored when isOpen is false', () => {
    const handleClose = jest.fn();
    render(
      <SteppedForm
        isOpen={false}
        onClose={handleClose}
        title="Closed Form Test"
        steps={sampleSteps}
        initialData={{}}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true });
    expect(handleClose).not.toHaveBeenCalled();
  });

  test('Single-step form edge case renders review step cleanly', () => {
    const singleStep = [
      {
        id: 'only-step',
        title: 'Satu-satunya Langkah',
        fields: [{ key: 'catatan', label: 'Catatan' }],
      },
    ];

    render(
      <SteppedForm
        isOpen={true}
        onClose={jest.fn()}
        title="Single Step Form"
        steps={singleStep}
        initialData={{ catatan: 'Halo' }}
      />
    );

    expect(screen.getByText('Bagian 1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Lanjut'));
    // Moves directly to review step
    expect(screen.getByText('Ringkasan & Verifikasi')).toBeInTheDocument();
    expect(screen.getByText('Simpan Data')).toBeInTheDocument();
  });
});

describe('STRESS TEST 2: Dialog Rapid Mount/Unmount, Focus Trap & A11y', () => {
  function TestHarness({ openInitially = false }) {
    const [open, setOpen] = useState(openInitially);
    return (
      <div>
        <button id="trigger-btn" onClick={() => setOpen((prev) => !prev)}>
          Toggle Dialog
        </button>
        <Dialog open={open} onClose={() => setOpen(false)} title="Modal Stress Test">
          <div>
            <p>Konten Dialog</p>
            <button id="modal-btn-1">Tombol 1</button>
            <input id="modal-input" placeholder="Input" />
            <button id="modal-btn-2">Tombol 2</button>
            <button id="modal-close" onClick={() => setOpen(false)}>Tutup</button>
          </div>
        </Dialog>
      </div>
    );
  }

  beforeEach(() => {
    document.body.style.overflow = '';
  });

  test('Rapid toggling 50 times does not leak document.body.style.overflow', () => {
    const { getByText } = render(<TestHarness openInitially={false} />);
    const toggleBtn = getByText('Toggle Dialog');

    expect(document.body.style.overflow).toBe('');

    // Rapidly toggle 50 times (even count ends closed)
    act(() => {
      for (let i = 0; i < 50; i++) {
        fireEvent.click(toggleBtn);
      }
    });

    // After 50 toggles (even number), dialog should be closed and overflow restored
    expect(document.body.style.overflow).toBe('');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Toggle once more (now open)
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Toggle once more (closed)
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(document.body.style.overflow).toBe('');
  });

  test('REMEDIATED: Dialog focus trap wraps to first element even when offsetParent is null', () => {
    render(<TestHarness openInitially={true} />);
    const dialog = screen.getByRole('dialog');
    const btn1 = screen.getByText('Tombol 1');
    const closeBtn = screen.getByText('Tutup');

    closeBtn.focus();
    // Tab from last element (Tutup): wraps around to first focusable element (Tombol 1)
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(btn1);

    // Shift+Tab from first element wraps to last element (Tutup)
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(closeBtn);
  });

  test('Dialog focus trap wraps to first element when offsetParent is polyfilled/valid', () => {
    const originalOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { return this.parentNode; },
      configurable: true,
    });

    try {
      render(<TestHarness openInitially={true} />);
      const dialog = screen.getByRole('dialog');
      const btn1 = screen.getByText('Tombol 1');
      const closeBtn = screen.getByText('Tutup');

      // Focus last element
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);

      // Press Tab from last element -> wraps to first element
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(btn1);

      // Press Shift+Tab from first element -> wraps to last element
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(closeBtn);
    } finally {
      if (originalOffsetParent) {
        Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent);
      } else {
        delete HTMLElement.prototype.offsetParent;
      }
    }
  });

  test('Focus trap in empty dialog does not crash and focuses panel', () => {
    render(
      <Dialog open={true} onClose={jest.fn()} title="Empty Dialog">
        <div>Tanpa elemen fokus</div>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(dialog);
  });

  test('Escape key closes dialog and stops propagation', () => {
    const onClose = jest.fn();
    const parentKeyDown = jest.fn();

    render(
      <div onKeyDown={parentKeyDown}>
        <Dialog open={true} onClose={onClose} title="Escape Test">
          <p>Dialog</p>
        </Dialog>
      </div>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(parentKeyDown).not.toHaveBeenCalled(); // stopped propagation
  });

  test('Backdrop click: calls onClose only when closeOnBackdrop=true', () => {
    const onClose1 = jest.fn();
    const { unmount } = render(
      <Dialog open={true} onClose={onClose1} title="Backdrop True" closeOnBackdrop={true}>
        <p>Konten</p>
      </Dialog>
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(onClose1).toHaveBeenCalledTimes(1);
    unmount();

    // Now test closeOnBackdrop=false
    const onClose2 = jest.fn();
    render(
      <Dialog open={true} onClose={onClose2} title="Backdrop False" closeOnBackdrop={false}>
        <p>Konten</p>
      </Dialog>
    );

    const backdrop2 = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop2);
    expect(onClose2).not.toHaveBeenCalled();
  });

  test('Focus restoration to trigger element after close', () => {
    jest.useFakeTimers();
    const { getByText } = render(<TestHarness openInitially={false} />);
    const trigger = getByText('Toggle Dialog');

    // Trigger is focused
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open dialog
    fireEvent.click(trigger);
    act(() => {
      jest.runAllTimers();
    });

    // Close dialog via close button
    const closeBtn = screen.getByText('Tutup');
    fireEvent.click(closeBtn);
    act(() => {
      jest.runAllTimers();
    });

    // Focus must be restored to trigger button
    expect(document.activeElement).toBe(trigger);
    jest.useRealTimers();
  });
});

describe('STRESS TEST 3: layoutId Sliding Indicators (No duplicates, no orphans)', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
  });

  test('DashboardToolbar: Rapid filter tab switching results in exactly 1 active pill', () => {
    const filters = [
      { value: 'all', label: 'Semua' },
      { value: 'data_umum', label: 'Data Umum' },
      { value: 'data_pokja1', label: 'Pokja I' },
      { value: 'data_pokja2', label: 'Pokja II' },
      { value: 'data_pokja3', label: 'Pokja III' },
      { value: 'data_pokja4', label: 'Pokja IV' },
    ];

    function ToolbarWrapper() {
      const [jenis, setJenis] = useState('all');
      return (
        <DashboardToolbar
          tahun={2026}
          setTahun={() => {}}
          years={[2026]}
          bulan={6}
          setBulan={() => {}}
          months={['Januari']}
          jenisData={jenis}
          setJenisData={setJenis}
          tableFilters={filters}
          onDownloadExcel={() => {}}
          onDownloadWord={() => {}}
          onDownloadTemplate={() => {}}
        />
      );
    }

    const { container } = render(<ToolbarWrapper />);

    // Rapid switching across all tabs 5 times in round-robin (30 tab changes)
    const tabLabels = ['Semua', 'Data Umum', 'Pokja I', 'Pokja II', 'Pokja III', 'Pokja IV'];
    act(() => {
      for (let cycle = 0; cycle < 5; cycle++) {
        for (const label of tabLabels) {
          const tabBtn = screen.getByRole('tab', { name: label });
          fireEvent.click(tabBtn);
        }
      }
    });

    // At the end, Pokja IV is selected
    const activeTabs = screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(activeTabs.length).toBe(1);
    expect(activeTabs[0]).toHaveTextContent('Pokja IV');

    // Check DOM for layoutId pill: should be exactly 1
    const pills = container.querySelectorAll('.bg-primary-600.rounded-lg');
    expect(pills.length).toBe(1);
  });

  test('Sidebar: Rapid navigation changes keep exactly 1 active pill across main & admin', () => {
    const adminUser = { username: 'admin', nama_lengkap: 'Admin', role: 'admin' };

    function SidebarWrapper({ pathname }) {
      mockPathname.mockReturnValue(pathname);
      return (
        <Sidebar
          user={adminUser}
          collapsed={false}
          onToggle={() => {}}
          onLogout={() => {}}
        />
      );
    }

    const { container, rerender } = render(<SidebarWrapper pathname="/dashboard" />);

    // Initially Dashboard is active
    let activeLinks = container.querySelectorAll('.nav-item-active');
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0]).toHaveAttribute('href', '/dashboard');

    // Rapidly switch across 8 different routes
    const routes = [
      '/dashboard/data-umum',
      '/dashboard/pokja1',
      '/dashboard/pokja2',
      '/dashboard/pokja3',
      '/dashboard/pokja4',
      '/dashboard/rekap-dawis',
      '/dashboard/bumil',
      '/dashboard/admin',
    ];

    for (const route of routes) {
      rerender(<SidebarWrapper pathname={route} />);
      activeLinks = container.querySelectorAll('.nav-item-active');
      expect(activeLinks.length).toBe(1);
      expect(activeLinks[0]).toHaveAttribute('href', route);

      // Verify pill exists inside active link
      const pill = activeLinks[0].querySelector('.bg-gradient-to-b');
      expect(pill).toBeInTheDocument();
    }
  });

  test('REMEDIATED: Sidebar renders cleanly without throwing when pathname is null', () => {
    mockPathname.mockReturnValue(null);
    let renderedContainer;
    expect(() => {
      const { container } = render(
        <Sidebar
          user={{ username: 'admin', nama_lengkap: 'Admin', role: 'admin' }}
          collapsed={false}
          onToggle={() => {}}
          onLogout={() => {}}
        />
      );
      renderedContainer = container;
    }).not.toThrow();

    // With null pathname, no navigation items should be marked active
    const activeLinks = renderedContainer.querySelectorAll('.nav-item-active');
    expect(activeLinks.length).toBe(0);
  });

  test('FormProgressBar: Rapid step clicks do not produce duplicate active indicators', () => {
    const steps = [
      { id: 's1', title: 'Step 1' },
      { id: 's2', title: 'Step 2' },
      { id: 's3', title: 'Step 3' },
      { id: 's4', title: 'Step 4' },
    ];

    function ProgressWrapper() {
      const [current, setCurrent] = useState(0);
      return (
        <div>
          <FormProgressBar steps={steps} currentStep={current} onStepClick={setCurrent} />
          <button id="advance" onClick={() => setCurrent((p) => Math.min(p + 1, steps.length - 1))}>
            Maju
          </button>
        </div>
      );
    }

    const { container } = render(<ProgressWrapper />);

    // Rapidly advance through steps
    const advanceBtn = screen.getByText('Maju');
    act(() => {
      for (let i = 0; i < 10; i++) {
        fireEvent.click(advanceBtn);
      }
    });

    // Check step 4 is current
    const currentStepBtn = screen.getByRole('button', { name: /Step 4/i });
    expect(currentStepBtn).toHaveAttribute('aria-current', 'step');

    // Verify exactly 1 active pill exists
    const pills = container.querySelectorAll('.ring-primary-300\\/60, .ring-primary-500\\/40');
    expect(pills.length).toBe(1);
  });

  test('Empty and edge-case props do not throw error or produce orphan pills', () => {
    // Empty steps in FormProgressBar
    const { container: c1 } = render(<FormProgressBar steps={[]} currentStep={0} />);
    expect(c1.firstChild).toBeNull();

    // Empty filters in DashboardToolbar
    const { container: c2 } = render(
      <DashboardToolbar
        tahun={2026}
        setTahun={() => {}}
        years={[2026]}
        bulan={1}
        setBulan={() => {}}
        months={['Januari']}
        jenisData="all"
        setJenisData={() => {}}
        tableFilters={[]}
        onDownloadExcel={() => {}}
        onDownloadWord={() => {}}
        onDownloadTemplate={() => {}}
      />
    );
    expect(c2.querySelector('[role="tablist"]')).toBeNull();
  });
});
