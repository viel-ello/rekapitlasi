/**
 * @file Test suite untuk komponen Typeform-style:
 *   - FormProgressBar
 *   - InlineFieldError
 *   - FormReviewStep
 *   - SteppedForm
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FormProgressBar from '@/components/ui/FormProgressBar';
import InlineFieldError from '@/components/ui/InlineFieldError';
import FormReviewStep from '@/components/ui/FormReviewStep';
import SteppedForm from '@/components/ui/SteppedForm';

describe('FormProgressBar', () => {
  const steps = [
    { id: 'step-1', title: 'Identitas' },
    { id: 'step-2', title: 'Data Pokok' },
    { id: 'step-3', title: 'Pemeriksaan' },
  ];

  test('render step counter dan progress bar dengan benar', () => {
    render(<FormProgressBar steps={steps} currentStep={1} />);
    expect(screen.getByText('Langkah 2 dari 3')).toBeInTheDocument();
    expect(screen.getByText('67% Selesai')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
  });

  test('klik step yang sudah selesai memanggil onStepClick', () => {
    const onStepClick = jest.fn();
    render(<FormProgressBar steps={steps} currentStep={2} onStepClick={onStepClick} />);
    fireEvent.click(screen.getByText('Identitas'));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });
});

describe('InlineFieldError', () => {
  test('render error saat error diberikan', () => {
    render(<InlineFieldError error="Kolom ini wajib diisi" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Kolom ini wajib diisi');
  });

  test('render warning saat tidak ada error', () => {
    render(<InlineFieldError warning="Nilai melonjak dari tahun lalu" />);
    expect(screen.getByRole('status')).toHaveTextContent('Nilai melonjak dari tahun lalu');
  });

  test('render hint dan unit', () => {
    render(<InlineFieldError hint="Contoh: 15" unit="orang" />);
    expect(screen.getByText('Contoh: 15')).toBeInTheDocument();
    expect(screen.getByText('Satuan: orang')).toBeInTheDocument();
  });
});

describe('FormReviewStep', () => {
  const groups = [
    {
      stepIndex: 0,
      title: 'Wilayah Dusun',
      fields: [
        { key: 'jml_rt', label: 'Jumlah RT', value: 5, unit: 'RT' },
        { key: 'jml_rw', label: 'Jumlah RW', value: 2, unit: 'RW' },
      ],
    },
    {
      stepIndex: 1,
      title: 'Data Ibu',
      fields: [
        { key: 'ibu_hamil', label: 'Ibu Hamil', value: 12, unit: 'orang' },
      ],
    },
  ];

  test('render seluruh field dan ringkasan nilai', () => {
    const onEditStep = jest.fn();
    render(
      <FormReviewStep
        groups={groups}
        onEditStep={onEditStep}
        summaryMeta={{ dusunName: 'Soko', tahun: 2026 }}
      />
    );

    expect(screen.getByText(/Dusun Soko/)).toBeInTheDocument();
    expect(screen.getByText('Jumlah RT')).toBeInTheDocument();
    expect(screen.getByText('Jumlah RW')).toBeInTheDocument();
    expect(screen.getByText('Ibu Hamil')).toBeInTheDocument();

    const editBtns = screen.getAllByRole('button', { name: /Ubah bagian/i });
    expect(editBtns.length).toBe(2);
    fireEvent.click(editBtns[0]);
    expect(onEditStep).toHaveBeenCalledWith(0);
  });
});

describe('SteppedForm', () => {
  const testSteps = [
    {
      id: 'step-1',
      title: 'Identitas',
      description: 'Langkah pertama',
      fields: [
        { key: 'nama_kader', label: 'Nama Kader', required: true },
        { key: 'jml_kader', label: 'Jumlah Kader' },
      ],
    },
    {
      id: 'step-2',
      title: 'Kegiatan',
      description: 'Langkah kedua',
      fields: [
        { key: 'jml_kegiatan', label: 'Jumlah Kegiatan' },
      ],
    },
  ];

  test('render langkah pertama dengan input field', () => {
    render(
      <SteppedForm
        isOpen={true}
        onClose={() => {}}
        title="Formulir Pokja I"
        steps={testSteps}
        initialData={{ nama_kader: 'Siti', jml_kader: 10 }}
      />
    );

    expect(screen.getByText('Formulir Pokja I')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama Kader/i)).toHaveValue('Siti');
    expect(screen.getByText('Lanjut')).toBeInTheDocument();
  });

  test('navigasi langkah maju dan mundur', () => {
    render(
      <SteppedForm
        isOpen={true}
        onClose={() => {}}
        title="Formulir Pokja I"
        steps={testSteps}
        initialData={{ nama_kader: 'Siti' }}
      />
    );

    // Maju ke step 2
    fireEvent.click(screen.getByText('Lanjut'));
    expect(screen.getByRole('heading', { name: 'Kegiatan' })).toBeInTheDocument();

    // Mundur ke step 1
    fireEvent.click(screen.getByText('Kembali'));
    expect(screen.getByLabelText(/Nama Kader/i)).toBeInTheDocument();
  });

  test('sampai ke langkah review dan submit data', async () => {
    const onSave = jest.fn();
    render(
      <SteppedForm
        isOpen={true}
        onClose={() => {}}
        title="Formulir Pokja I"
        steps={testSteps}
        initialData={{ nama_kader: 'Siti', jml_kader: 5, jml_kegiatan: 3 }}
        onSave={onSave}
      />
    );

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Lanjut'));
    // Step 2 -> Step Review
    fireEvent.click(screen.getByText('Lanjut'));

    expect(screen.getByText('Tinjauan Akhir Sebelum Simpan')).toBeInTheDocument();
    expect(screen.getByText('Simpan Data')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Simpan Data'));
    expect(onSave).toHaveBeenCalledWith({
      nama_kader: 'Siti',
      jml_kader: 5,
      jml_kegiatan: 3,
    });
  });
});
