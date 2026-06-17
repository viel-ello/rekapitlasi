/**
 * @file Test DashboardToolbar: render filter & action, trigger download callbacks.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardToolbar from '@/components/DashboardToolbar';

const baseProps = {
  tahun: 2026,
  setTahun: jest.fn(),
  years: [2025, 2026, 2027],
  bulan: 6,
  setBulan: jest.fn(),
  months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  jenisData: 'all',
  setJenisData: jest.fn(),
  tableFilters: [{ value: 'all', label: 'Semua' }, { value: 'data_umum', label: 'Data Umum' }],
  onDownloadExcel: jest.fn(),
  onDownloadWord: jest.fn(),
  onDownloadTemplate: jest.fn(),
  downloading: null,
  downloadingTemplate: null,
};

describe('DashboardToolbar', () => {
  test('render tombol Excel, Word, Import', () => {
    render(<DashboardToolbar {...baseProps} />);
    expect(screen.getByLabelText('Unduh laporan Excel')).toBeInTheDocument();
    expect(screen.getByLabelText('Unduh laporan Word')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  test('klik Excel memanggil onDownloadExcel', () => {
    render(<DashboardToolbar {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Unduh laporan Excel'));
    expect(baseProps.onDownloadExcel).toHaveBeenCalled();
  });

  test('klik Word memanggil onDownloadWord', () => {
    render(<DashboardToolbar {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Unduh laporan Word'));
    expect(baseProps.onDownloadWord).toHaveBeenCalled();
  });

  test('overflow menu membuka opsi template', () => {
    render(<DashboardToolbar {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Tindakan lain'));
    // Salah satu item template muncul setelah menu dibuka
    expect(screen.getByText(/Template|Unduh Template/i)).toBeInTheDocument();
  });
});
