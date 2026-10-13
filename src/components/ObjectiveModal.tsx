import React, { useState } from 'react';
import { BreakthroughObjective, Language, PolicyLevel } from '../types';
import { X, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { TrilingualInputGroup } from './TrilingualInputGroup';

interface ObjectiveModalProps {
  objective?: BreakthroughObjective | null;
  language: Language;
  level: PolicyLevel;
  nextCode?: string;
  defaultPeriod?: string;
  isThreeYear?: boolean;
  onClose: () => void;
  onSave: (obj: BreakthroughObjective) => void;
  onDelete?: (id: string) => void;
}

export const ObjectiveModal: React.FC<ObjectiveModalProps> = ({
  objective,
  language,
  level,
  nextCode = `${level}.1`,
  defaultPeriod,
  isThreeYear = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const isVi = language === 'vi';
  const isEdit = Boolean(objective);

  const initialPeriod = objective?.period || defaultPeriod || (isThreeYear ? '2026 - 2028' : '2026');

  const [code, setCode] = useState(objective?.code || nextCode);
  const [titleVi, setTitleVi] = useState(objective?.titleVi || '');
  const [title, setTitle] = useState(objective?.title || '');
  const [titleKo, setTitleKo] = useState(objective?.titleKo || '');
  const [period, setPeriod] = useState(initialPeriod);
  const [description, setDescription] = useState(objective?.description || '');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || titleVi.trim() || titleKo.trim();
    if (!code.trim() || !finalTitle) return;

    const savedObj: BreakthroughObjective = {
      ...(objective || {}),
      id: objective?.id || `obj_${Date.now()}`,
      code: code.trim(),
      title: finalTitle,
      titleVi: titleVi.trim() || finalTitle,
      titleKo: titleKo.trim() || finalTitle,
      period: period.trim() || '2026',
      description: description.trim(),
      linkedObjectiveIds: objective?.linkedObjectiveIds || [],
      linkedPriorityIds: objective?.linkedPriorityIds || [],
    };

    onSave(savedObj);
    onClose();
  };

  const handleConfirmDelete = () => {
    if (objective && onDelete) {
      onDelete(objective.id);
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
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {isEdit
              ? isVi
                ? `Chỉnh Sửa Mục Tiêu Đột Phá (${objective?.code})`
                : `Edit Breakthrough Objective (${objective?.code})`
              : isThreeYear
              ? isVi
                ? 'Thêm Mục Tiêu Đột Phá 3 Năm (2026 ~ 2028)'
                : 'Add New 3-Year Breakthrough Objective (2026 ~ 2028)'
              : isVi
              ? 'Thêm Mục Tiêu Đột Phá Hàng Năm (2026)'
              : 'Add New Annual Breakthrough Objective (2026)'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isVi ? 'Mã Mục Tiêu (Code):' : 'Objective Code:'}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="e.g. L1.1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isVi ? 'Kỳ Hạn (Period):' : 'Target Period:'}
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
                placeholder="2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <TrilingualInputGroup
            label={isVi ? 'Tên Mục Tiêu Đột Phá' : 'Breakthrough Objective Title'}
            valueEn={title}
            valueVi={titleVi}
            valueKo={titleKo}
            onChangeEn={setTitle}
            onChangeVi={setTitleVi}
            onChangeKo={setTitleKo}
            context="objective"
            required
            language={language}
            placeholderEn="e.g. Expand Production Capacity / Zero Defect Culture"
            placeholderVi="Ví dụ: Mở rộng năng lực sản xuất / Văn hóa không lỗi"
            placeholderKo="예시: 생산 역량 확장 / 무결점 제조 문화"
          />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isVi ? 'Mô Tả / Ghi Chú:' : 'Description / Notes:'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={
                isVi
                  ? 'Nhập thông tin mô tả chi tiết về mục tiêu đột phá này...'
                  : 'Detailed breakdown or target specifics...'
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
            />
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
                <span>{isVi ? 'Xóa Mục Tiêu' : 'Delete Objective'}</span>
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
                    ? 'Thêm Mục Tiêu'
                    : 'Add Objective'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {showConfirmDelete && objective && (
        <ConfirmDeleteModal
          title={isVi ? 'Xác Nhận Xóa Mục Tiêu' : 'Confirm Delete Objective'}
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa mục tiêu đột phá "${objective.code}: ${objective.titleVi || objective.title}" không?`
              : `Are you sure you want to delete objective "${objective.code}: ${objective.title}"?`
          }
          language={language}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  );
};
