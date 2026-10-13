import React, { useState } from 'react';
import {
  KpiItem,
  PolicyLevel,
  Department,
  Language,
  TargetDirection,
  MonthKey,
} from '../types';
import { X, Plus, Check, UserCheck } from 'lucide-react';
import { TrilingualInputGroup } from './TrilingualInputGroup';

interface AddKpiModalProps {
  currentLevel: PolicyLevel;
  language: Language;
  onClose: () => void;
  onAddKpi: (newKpi: KpiItem) => void;
}

const RESOURCE_KEYS: { key: string; label: string }[] = [
  { key: 'biz', label: 'Biz' },
  { key: 'quality', label: 'Quality' },
  { key: 'csr', label: 'CSR' },
  { key: 'lean', label: 'Lean' },
  { key: 'dev', label: 'Dev' },
  { key: 'prod', label: 'Prod' },
  { key: 'it', label: 'IT' },
];

export const AddKpiModal: React.FC<AddKpiModalProps> = ({
  currentLevel,
  language,
  onClose,
  onAddKpi,
}) => {
  const isVi = language === 'vi';

  const [code, setCode] = useState(`${currentLevel} 1.x.x`);
  const [name, setName] = useState('');
  const [nameVi, setNameVi] = useState('');
  const [nameKo, setNameKo] = useState('');
  const [department, setDepartment] = useState<Department>('Lean');
  const [unit, setUnit] = useState('%');
  const [targetDirection, setTargetDirection] = useState<TargetDirection>('higher');
  const [owner, setOwner] = useState('Lean: Quang');
  const [jumpingOffPoint, setJumpingOffPoint] = useState('Jan. 2026');
  const [janTarget, setJanTarget] = useState<string>('100%');
  const [resourceRoles, setResourceRoles] = useState<Record<string, 'primary' | 'secondary' | 'none'>>({
    lean: 'primary',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || nameVi.trim() || nameKo.trim();
    if (!code || !finalName) return;

    const months: MonthKey[] = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthly: any = {};
    months.forEach((m) => {
      monthly[m] = {
        target: janTarget || '100%',
        actual: null,
      };
    });

    const newKpiItem: KpiItem = {
      id: `kpi-custom-${Date.now()}`,
      code: code.trim(),
      name: finalName,
      nameVi: nameVi.trim() || finalName,
      nameKo: nameKo.trim() || finalName,
      level: currentLevel,
      department,
      unit: unit.trim() || 'points',
      jumpingOffPoint: jumpingOffPoint.trim() || 'Jan. 2026',
      targetDirection,
      owner: owner.trim() || 'Management',
      monthly,
      resourceRoles,
    };

    onAddKpi(newKpiItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            {isVi
              ? `Thêm Chỉ Số KPI Mới vào ${currentLevel}`
              : `Add New KPI Metric to ${currentLevel}`}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isVi ? 'Mã Guide / Code:' : 'Guide Code:'}
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
                {isVi ? 'Bộ Phận:' : 'Department:'}
              </label>
              <select
                value={department}
                onChange={(e) => {
                  const dept = e.target.value as Department;
                  setDepartment(dept);
                  const key = dept.toLowerCase();
                  if (['biz', 'quality', 'csr', 'lean', 'dev', 'prod', 'it'].includes(key)) {
                    setResourceRoles((prev) => ({ ...prev, [key]: 'primary' }));
                  }
                }}
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
          </div>

          <TrilingualInputGroup
            label={isVi ? 'Tên Chỉ Số KPI Mới' : 'New KPI Metric Name'}
            valueEn={name}
            valueVi={nameVi}
            valueKo={nameKo}
            onChangeEn={setName}
            onChangeVi={setNameVi}
            onChangeKo={setNameKo}
            context="kpi"
            required
            language={language}
            placeholderEn="e.g. OEE Improvement to 85% / First Pass Yield"
            placeholderVi="Ví dụ: Cải thiện OEE lên 85% / Tỷ lệ đạt lần đầu"
            placeholderKo="예시: OEE 85% 개선 / 직행률 향상"
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
                placeholder="%, points, Days"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Direction:
              </label>
              <select
                value={targetDirection}
                onChange={(e) => setTargetDirection(e.target.value as TargetDirection)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="higher">Higher is better (Tăng)</option>
                <option value="lower">Lower is better (Giảm)</option>
                <option value="boolean">Boolean (Y/N)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Owner:
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. Lean: Quang"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Benchmark:
              </label>
              <input
                type="text"
                value={janTarget}
                onChange={(e) => setJanTarget(e.target.value)}
                placeholder="e.g. 100% or 3.0"
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

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
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
              <Check className="w-4 h-4" />
              <span>{isVi ? 'Thêm Chỉ Số' : 'Add Metric'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
