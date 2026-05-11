'use client';

/**
 * @file Reusable empty state. Pakai di list/tabel yang bisa kosong.
 *
 * Contoh:
 *   <EmptyState
 *     icon={ClipboardList}
 *     title="Belum ada log aktivitas"
 *     description="Aktivitas akan muncul setelah pengguna menyimpan data."
 *     action={{ label: 'Buka Dashboard', href: '/dashboard' }}
 *   />
 */

import Link from 'next/link';
import { ClipboardList } from 'flowbite-react-icons/outline';

export default function EmptyState({
  icon: Icon = ClipboardList,
  title,
  description,
  action = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-md">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
