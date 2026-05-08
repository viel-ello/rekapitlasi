import { ExclamationCircle } from 'flowbite-react-icons/outline';
import { useEffect, useState } from 'react';

export default function ConfirmModal({ 
  isOpen, 
  title = "Konfirmasi Tindakan", 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Ya, Lanjutkan", 
  cancelText = "Batal",
  type = "danger" 
}) {
  const [show, setShow] = useState(false);

  // Handle animation timing
  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 200); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCancel}
      />

      {/* Modal Box */}
      <div 
        className={`relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden transition-all duration-200 transform ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            <ExclamationCircle className="w-6 h-6" />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {title}
          </h3>
          
          <p className="text-sm text-gray-500 mb-6">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row w-full gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors ${
                type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
