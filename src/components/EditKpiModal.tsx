import React, { useState } from 'react';
import {
  KpiItem,
  PolicyLevel,
  Department,
  Language,
  TargetDirection,
} from '../types';
import { X, Save, Trash2, UserCheck } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { TrilingualInputGroup } from './TrilingualInputGroup';

interface EditKpiModalProps {
  kpi: KpiItem;
  language: Language;
  onClose: () => void;
  onUpdateKpi: (updatedKpi: KpiItem) => void;
  onDeleteKpi?: (kpiId: string) => void;
}

const RESOURCE_KEYS: { key: string; label: string }[] = [
  { key: 'biz', label: 'Biz' },
  { key: 'quality', label: 'Quality' },
  { key: 'csr', label: 'CSR' },
  { key: 'lean', label: 'Lean' },
  { key: 'dev', label: 'Dev' },
  { key: 'plan', label: 'Planning' },
  { key: 'prod', label: 'Prod' },
  { key: 'it', label: 'IT' },
];

export const EditKpiModal: React.FC<EditKpiModalProps> = ({
  kpi,
  language,
  onClose,
  onUpdateKpi,
  onDeleteKpi,
}) => {
  const isVi = language === 'vi';

  const [code, setCode] = useState(kpi.code);
  const [name, setName] = useState(kpi.name);
  const [nameVi, setNameVi] = useState(kpi.nameVi || '');
  const [nameKo, setNameKo] = useState(kpi.nameKo || '');
  const [department, setDepartment] = useState<Department>(kpi.department);
  const [unit, setUnit] = useState(kpi.unit);
  const [targetDirection, setTargetDirection] = useState<TargetDirection>(
    kpi.targetDirection
  );
  const [owner, setOwner] = useState(kpi.owner);
  const [jumpingOffPoint, setJumpingOffPoint] = useState(kpi.jumpingOffPoint);
  const [level, setLevel] = useState<PolicyLevel>(kpi.level);
  const [resourceRoles, setResourceRoles] = useState<Record<string, 'primary' | 'secondary' | 'none'>>(
    kpi.resourceRoles || {}
  );
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || nameVi.trim() || nameKo.trim();
    if (!code || !finalName) return;

    const updated: KpiItem = {
      ...kpi,
      code: code.trim(),
      name: finalName,
      nameVi: nameVi.trim() || finalName,
      nameKo: nameKo.trim() || finalName,
      department,
      unit: unit.trim() || 'points',
      targetDirection,
      owner: owner.trim(),
      jumpingOffPoint: jumpingOffPoint.trim(),
      level,
      resourceRoles,
    };

    onUpdateKpi(updated);
    onClose();
  };

  const handleConfirmDelete = () => {
    if (onDeleteKpi) {
      onDeleteKpi(kpi.id);
    }
    setShowConfirmDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Save className="w-4 h-4 text-blue-400" />
            {isVi ? `Chỉnh Sửa KPI (${kpi.code})` : `Edit KPI (${kpi.code})`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isVi ? 'Mã KPI / Code:' : 'KPI Code:'}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isVi ? 'Cấp Độ Policy:' : 'Policy Level:'}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as PolicyLevel)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="L1">L1 (Company)</option>
                <option value="L2">L2 (Department)</option>
                <option value="L3">L3 (Section/Team)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isVi ? 'Bộ Phận:' : 'Department:'}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Lean">Lean</option>
                <option value="Delivery">Delivery</option>
                <option value="Development">Development</option>
                <option value="Quality">Quality</option>
                <option value="Production">Production</option>
                <option value="Biz">Biz</option>
                <option value="IT">IT</option>
                <option value="CSR">CSR</option>
                <option value="HR">HR</option>
                <option value="Planning">Planning</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Owner (Người phụ trách):
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
                placeholder="e.g. Lean: Quang"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <TrilingualInputGroup
            label={isVi ? 'Tên Chỉ Số KPI' : 'KPI Metric Name'}
            valueEn={name}
            valueVi={nameVi}
            valueKo={nameKo}
            onChangeEn={setName}
            onChangeVi={setNameVi}
            onChangeKo={setNameKo}
            context="kpi"
            required
            language={language}
            placeholderEn="e.g. Defect Rate / PPH / Line Balancing"
            placeholderVi="e.g. Tỷ lệ lỗi / Năng suất đôi/giờ"
            placeholderKo="e.g. 불량률 / 시간당 생산량"
          />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unit:
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Direction:
              </label>
              <select
                value={targetDirection}
                onChange={(e) =>
                  setTargetDirection(e.target.value as TargetDirection)
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="higher">Higher (Tăng)</option>
                <option value="lower">Lower (Giảm)</option>
                <option value="boolean">Boolean (Y/N)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Jump Off Point:
              </label>
              <input
                type="text"
                value={jumpingOffPoint}
                onChange={(e) => setJumpingOffPoint(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Department / Resource Responsibility Allocation */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <UserCheck className="w-4 h-4 text-blue-600" />
                {isVi
                  ? 'Phân Công Trách Nhiệm Bộ Phận (Chính / Phụ)'
                  : 'Department Responsibility Allocation'}
              </label>
              <span className="text-[11px] text-slate-500 italic">
                {isVi ? 'Chính (●) / Phụ (○)' : 'Primary (●) / Secondary (○)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {RESOURCE_KEYS.map((res) => {
                const currentRole = resourceRoles[res.key] || 'none';
                return (
                  <div
                    key={res.key}
                    className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold text-slate-700 text-xs">
                      {res.label}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          setResourceRoles((prev) => ({
                            ...prev,
                            [res.key]: 'primary',
                          }))
                        }
                        className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                          currentRole === 'primary'
                            ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-900'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ● {isVi ? 'Chính' : 'Primary'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setResourceRoles((prev) => ({
                            ...prev,
                            [res.key]: 'secondary',
                          }))
                        }
                        className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                          currentRole === 'secondary'
                            ? 'bg-white text-slate-900 border border-slate-800 shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ○ {isVi ? 'Phụ' : 'Secondary'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setResourceRoles((prev) => ({
                            ...prev,
                            [res.key]: 'none',
                          }))
                        }
                        className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                          currentRole === 'none'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {isVi ? 'Không' : 'None'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {onDeleteKpi ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center space-x-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isVi ? 'Xóa KPI' : 'Delete KPI'}</span>
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
                <span>{isVi ? 'Lưu Thay Đổi' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {showConfirmDelete && (
        <ConfirmDeleteModal
          title={isVi ? 'Xác Nhận Xóa KPI' : 'Confirm Delete KPI'}
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa vĩnh viễn chỉ số KPI "${kpi.code}: ${kpi.nameVi || kpi.name}" không? Hành động này không thể hoàn tác.`
              : `Are you sure you want to permanently delete KPI "${kpi.code}: ${kpi.name}"? This action cannot be undone.`
          }
          language={language}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  );
};
