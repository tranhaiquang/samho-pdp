import React, { useState } from 'react';
import { ImprovementPriority, Language, PolicyLevel } from '../types';
import { X, Save, Sliders, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { TrilingualInputGroup } from './TrilingualInputGroup';

interface PriorityModalProps {
  priority?: ImprovementPriority | null;
  language: Language;
  level: PolicyLevel;
  nextCode?: string;
  onClose: () => void;
  onSave: (p: ImprovementPriority) => void;
  onDelete?: (id: string) => void;
}

export const PriorityModal: React.FC<PriorityModalProps> = ({
  priority,
  language,
  level,
  nextCode = `${level} 1.1.1`,
  onClose,
  onSave,
  onDelete,
}) => {
  const isVi = language === 'vi';
  const isEdit = Boolean(priority);

  const [code, setCode] = useState(priority?.code || nextCode);
  const [titleVi, setTitleVi] = useState(priority?.titleVi || '');
  const [title, setTitle] = useState(priority?.title || '');
  const [titleKo, setTitleKo] = useState(priority?.titleKo || '');
  const [owner, setOwner] = useState(priority?.owner || '');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || titleVi.trim() || titleKo.trim();
    if (!code.trim() || !finalTitle) return;

    const savedPriority: ImprovementPriority = {
      ...(priority || {}),
      id: priority?.id || `p_${Date.now()}`,
      code: code.trim(),
      title: finalTitle,
      titleVi: titleVi.trim() || finalTitle,
      titleKo: titleKo.trim() || finalTitle,
      owner: owner.trim() || undefined,
      resourceRoles: priority?.resourceRoles || {},
      linkedObjectiveIds: priority?.linkedObjectiveIds || [],
      linkedPriorityIds: priority?.linkedPriorityIds || [],
    };

    onSave(savedPriority);
    onClose();
  };

  const handleConfirmDelete = () => {
    if (priority && onDelete) {
      onDelete(priority.id);
    }
    setShowConfirmDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            {isEdit
              ? isVi
                ? `Chỉnh Sửa Ưu Tiên Cải Thiện Hàng Đầu (${priority?.code})`
                : `Edit Top Improvement Priority (${priority?.code})`
              : isVi
              ? 'Thêm Ưu Tiên Cải Thiện Hàng Đầu Mới'
              : 'Add New Top Improvement Priority'}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isVi ? 'Mã Ưu Tiên Hàng Đầu (Code):' : 'Top Priority Code:'}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="e.g. L1 1.1.1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isVi ? 'Người Phụ Trách (Owner):' : 'Responsible Owner:'}
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. Quang / Lean"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <TrilingualInputGroup
            label={isVi ? 'Nội Dung Ưu Tiên Cải Thiện Hàng Đầu' : 'Top Improvement Priority Title'}
            valueEn={title}
            valueVi={titleVi}
            valueKo={titleKo}
            onChangeEn={setTitle}
            onChangeVi={setTitleVi}
            onChangeKo={setTitleKo}
            context="priority"
            required
            language={language}
            placeholderEn="e.g. Optimize & Utilize existing facility / Upgrade Mini-lines"
            placeholderVi="Ví dụ: Tối ưu hóa cơ sở vật chất hiện hữu / Nâng cấp chuyền mini"
            placeholderKo="예시: 기존 시설 활용 극대화 / 미니라인 고도화"
          />

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center space-x-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isVi ? 'Xóa Ưu Tiên Hàng Đầu' : 'Delete Priority'}</span>
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
                className="flex items-center space-x-1.5 px-5 py-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isEdit
                    ? isVi
                      ? 'Lưu Thay Đổi'
                      : 'Save Changes'
                    : isVi
                    ? 'Thêm Ưu Tiên Hàng Đầu'
                    : 'Add Priority'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {showConfirmDelete && priority && (
        <ConfirmDeleteModal
          title={isVi ? 'Xác Nhận Xóa Ưu Tiên Cải Thiện Hàng Đầu' : 'Confirm Delete Top Improvement Priority'}
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa ưu tiên cải thiện hàng đầu "${priority.code}: ${priority.titleVi || priority.title}" không? Hành động này không thể hoàn tác.`
              : `Are you sure you want to delete top improvement priority "${priority.code}: ${priority.title}"?`
          }
          language={language}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  );
};
