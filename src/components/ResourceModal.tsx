import React, { useState } from 'react';
import { ResourcePerson, Language, Department } from '../types';
import { X, Save, UserCheck, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ResourceModalProps {
  resource?: ResourcePerson | null;
  language: Language;
  onClose: () => void;
  onSave: (r: ResourcePerson) => void;
  onDelete?: (key: string) => void;
}

const DEPARTMENT_OPTIONS: Department[] = [
  'Biz',
  'Quality',
  'CSR',
  'Lean',
  'Development',
  'Production',
  'IT',
  'Delivery',
  'HR',
  'Planning',
];

export const ResourceModal: React.FC<ResourceModalProps> = ({
  resource,
  language,
  onClose,
  onSave,
  onDelete,
}) => {
  const isVi = language === 'vi';
  const isEdit = Boolean(resource);

  const [department, setDepartment] = useState<string>(resource?.department || 'Biz');
  const [name, setName] = useState<string>(resource?.name || '');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!department.trim() || !name.trim()) return;

    const key = `${department.trim()}: ${name.trim()}`;
    const savedResource: ResourcePerson = {
      key: resource?.key || key,
      department: department.trim(),
      name: name.trim(),
      fullTitle: key,
    };

    onSave(savedResource);
    onClose();
  };

  const handleConfirmDelete = () => {
    if (resource && onDelete) {
      onDelete(resource.key);
    }
    setShowConfirmDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            {isEdit
              ? isVi
                ? `Chỉnh Sửa Nguồn Lực (${resource?.key})`
                : `Edit Personnel Resource (${resource?.key})`
              : isVi
              ? 'Thêm Nguồn Lực & Nhân Sự Mới'
              : 'Add New Personnel Resource'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isVi ? 'Phòng Ban / Bộ Phận (Department):' : 'Department / Team:'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                placeholder="e.g. Biz, Lean, Quality, Production"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {DEPARTMENT_OPTIONS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDepartment(dept)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border transition ${
                    department === dept
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isVi ? 'Tên Nhân Sự Phụ Trách (Owner Name):' : 'Person Name:'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Ngoc, Quang, Huong, WSPark"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600">
            <span className="font-semibold block mb-0.5">{isVi ? 'Hiển thị mẫu:' : 'Display preview:'}</span>
            <span className="font-mono text-emerald-700 font-bold">
              {department ? department.trim() : 'Dept'}: {name ? name.trim() : 'Name'}
            </span>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center space-x-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isVi ? 'Xóa Nhân Sự' : 'Delete Resource'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isEdit
                    ? isVi
                      ? 'Lưu Thay Đổi'
                      : 'Save Changes'
                    : isVi
                    ? 'Thêm Nhân Sự'
                    : 'Add Resource'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {showConfirmDelete && resource && (
        <ConfirmDeleteModal
          title={isVi ? 'Xác Nhận Xóa Nguồn Lực' : 'Confirm Delete Personnel Resource'}
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa nhân sự/nguồn lực "${resource.key}" không? Hành động này không thể hoàn tác.`
              : `Are you sure you want to delete personnel resource "${resource.key}"?`
          }
          language={language}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  );
};
