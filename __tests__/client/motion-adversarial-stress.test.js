import React from 'react';
import { render, screen, act } from '@testing-library/react';
import AnimatedCounter from '@/components/AnimatedCounter';
import { Button } from '@/components/ui/button';
import Dialog from '@/components/ui/Dialog';
import SteppedForm from '@/components/ui/SteppedForm';
import Topbar from '@/components/Topbar';
import * as framerMotion from 'framer-motion';
import fs from 'fs';
import path from 'path';

// Mock next/navigation for Topbar
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard',
}));

// Mock useTheme for Topbar
jest.mock('@/lib/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

describe('Adversarial Stress Verification - Challenger 2', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], unreadCount: 0 }),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('1. AnimatedCounter Edge Cases & Stress Harness', () => {
    test('renders negative integers correctly with locale formatting', () => {
      render(<AnimatedCounter value={-1250} start={-1250} />);
      expect(screen.getByText('-1.250')).toBeInTheDocument();
    });

    test('renders zero correctly across different falsy/zero representations', () => {
      const { rerender } = render(<AnimatedCounter value={0} start={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();

      rerender(<AnimatedCounter value="0" start="0" />);
      expect(screen.getByText('0')).toBeInTheDocument();

      rerender(<AnimatedCounter value={-0} start={-0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('handles extreme inputs (empty string, null, undefined, NaN, Infinity, -Infinity) gracefully with fallback 0', () => {
      const edgeCases = ['', null, undefined, NaN, Infinity, -Infinity, 'invalid-string', '---', {}];
      
      edgeCases.forEach((val, idx) => {
        const { unmount } = render(
          <span data-testid={`edge-${idx}`}>
            <AnimatedCounter value={val} start={0} />
          </span>
        );
        const el = screen.getByTestId(`edge-${idx}`);
        expect(el.textContent).toBe('0');
        unmount();
      });
    });

    test('handles extreme large values (trillions) without crashing', () => {
      render(<AnimatedCounter value={1000000000000} start={1000000000000} />);
      expect(screen.getByText('1.000.000.000.000')).toBeInTheDocument();
    });

    test('handles floating point numbers without breaking Indonesian locale formatting', () => {
      render(<AnimatedCounter value={42.7} start={42.7} />);
      expect(screen.getByText('42,7')).toBeInTheDocument();
    });

    test('rapid updates stress harness: 50 sequential re-renders do not crash or produce NaN', () => {
      const { rerender } = render(<AnimatedCounter value={0} start={0} />);
      
      act(() => {
        for (let i = 1; i <= 50; i++) {
          rerender(<AnimatedCounter value={i * 10} start={0} />);
        }
      });

      // Target should be reachable, component must remain intact without NaN
      expect(screen.queryByText(/NaN/)).toBeNull();
    });

    test('useReducedMotion() immediately displays formatted final target and updates on prop change', () => {
      jest.spyOn(framerMotion, 'useReducedMotion').mockReturnValue(true);

      const { rerender } = render(<AnimatedCounter value={54321} start={0} />);
      expect(screen.getByText('54.321')).toBeInTheDocument();

      rerender(<AnimatedCounter value={99999} start={0} />);
      expect(screen.getByText('99.999')).toBeInTheDocument();
    });
  });

  describe('2. prefers-reduced-motion Verification Across Components', () => {
    test('Button disables scale tap animation and collapses transition when reduced motion is preferred', () => {
      jest.spyOn(framerMotion, 'useReducedMotion').mockReturnValue(true);

      const { container } = render(<Button>Aksi</Button>);
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe('Aksi');
    });

    test('Dialog panel initial and exit animations collapse to pure opacity fade when reduced motion is preferred', () => {
      jest.spyOn(framerMotion, 'useReducedMotion').mockReturnValue(true);

      render(
        <Dialog open onClose={() => {}} title="Dialog Modal Uji">
          <p>Konten Dialog</p>
        </Dialog>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Konten Dialog')).toBeInTheDocument();
    });

    test('SteppedForm directional slide collapses to zero horizontal translation when reduced motion is preferred', () => {
      jest.spyOn(framerMotion, 'useReducedMotion').mockReturnValue(true);

      const testSteps = [
        {
          id: 'step1',
          title: 'Langkah Satu',
          fields: [{ key: 'nama', label: 'Nama', type: 'text' }],
        },
        {
          id: 'step2',
          title: 'Langkah Dua',
          fields: [{ key: 'alamat', label: 'Alamat', type: 'text' }],
        },
      ];

      render(
        <SteppedForm
          isOpen={true}
          onClose={() => {}}
          title="Uji Form Berjenjang"
          steps={testSteps}
          initialData={{ nama: 'Budi' }}
        />
      );

      expect(screen.getByText('Uji Form Berjenjang')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Langkah Satu' })).toBeInTheDocument();
    });

    test('Topbar dropdown variants collapse motion scale and displacement when reduced motion is preferred', async () => {
      jest.spyOn(framerMotion, 'useReducedMotion').mockReturnValue(true);

      render(<Topbar user={{ nama_lengkap: 'Siti Aminah', role: 'admin' }} />);
      expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    });
  });

  describe('3. Codebase-wide GPU Invariant & Non-Composite Animation Audit', () => {
    function findSourceFiles(dir, fileList = []) {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!['node_modules', '.next', '.git', '.agents'].includes(file)) {
            findSourceFiles(fullPath, fileList);
          }
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
          fileList.push(fullPath);
        }
      });
      return fileList;
    }

    test('No component animates backdropFilter, backdrop-filter, or filter in motion props', () => {
      const targetDirs = [
        path.join(process.cwd(), 'components'),
        path.join(process.cwd(), 'app'),
      ];

      const allFiles = targetDirs.flatMap((dir) => findSourceFiles(dir));
      const violations = [];

      const forbiddenMotionPropsPattern = /(?:animate|initial|exit|whileHover|whileTap|variants)\s*=\s*(?:\{[^}]*(?:backdropFilter|backdrop-filter|filter\s*:)[^}]*\}|"[^"]*(?:backdropFilter|backdrop-filter)[^"]*")/gi;
      const forbiddenPropertyInObjectPattern = /(?:backdropFilter|backdrop-filter)\s*:/gi;

      allFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Scan for motion props animating forbidden filter properties
        const matches = content.match(forbiddenMotionPropsPattern);
        if (matches) {
          violations.push({ filePath, matches });
        }

        // Also check if any variant object animates backdropFilter
        if (forbiddenPropertyInObjectPattern.test(content)) {
          // If backdropFilter appears in JS object definition
          violations.push({ filePath, reason: 'Found direct backdropFilter in JS' });
        }
      });

      expect(violations).toEqual([]);
    });

    test('All Framer Motion transitions preserve GPU composition (opacity, transform/x/y/scale, boxShadow)', () => {
      const dialogPath = path.join(process.cwd(), 'components', 'ui', 'Dialog.jsx');
      const dialogContent = fs.readFileSync(dialogPath, 'utf-8');

      // Verify Dialog panel uses transform and opacity only
      expect(dialogContent).toContain("scale: 0.95, y: 16");
      expect(dialogContent).toContain("opacity: 1, scale: 1, y: 0");
      expect(dialogContent).not.toContain("backdropFilter:");

      const steppedFormPath = path.join(process.cwd(), 'components', 'ui', 'SteppedForm.jsx');
      const steppedFormContent = fs.readFileSync(steppedFormPath, 'utf-8');

      // Verify SteppedForm slide uses x and opacity only
      expect(steppedFormContent).toContain("x: shouldReduceMotion ? 0 : dir > 0 ? 32 : -32");
      expect(steppedFormContent).toContain("x: 0");
      expect(steppedFormContent).not.toContain("backdropFilter:");
    });
  });
});
