import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Language } from '../types';

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  language: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  title,
  message,
  language,
  onConfirm,
  onCancel,
}) => {
  const isVi = language === 'vi';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="p-5 flex items-start space-x-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 px-5 py-3 flex items-center justify-end space-x-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-lg transition"
          >
            {isVi ? 'Hủy Bỏ' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isVi ? 'Xác Nhận Xóa' : 'Confirm Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
