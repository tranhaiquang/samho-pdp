import React, { useState } from 'react';
import {
  Language,
  LevelPolicyData,
  UserAccount,
  UserRole,
  PolicyLevel,
  CompanySettings,
} from '../types';
import {
  Settings,
  Users,
  Building2,
  UserCheck,
  Shield,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Save,
  Globe2,
  Sparkles,
  KeyRound,
  Eye,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { getTeamColorConfig } from '../lib/teamUtils';

interface SettingsViewProps {
  language: Language;
  companySettings: CompanySettings;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  users: UserAccount[];
  currentUser: UserAccount;
  onSwitchUser: (user: UserAccount) => void;
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  l1Data: LevelPolicyData;
  l2Data: LevelPolicyData;
  l3Data: LevelPolicyData;
  onUpdateLevelOwner: (
    level: PolicyLevel,
    owner: string,
    revDate?: string,
    titleVi?: string,
    title?: string
  ) => void;
}

const DEPARTMENTS = [
  'Lean',
  'Delivery',
  'Responsible Leadership',
  'Development',
  'Quality',
  'Production',
  'Biz',
  'IT',
  'CSR',
  'HR',
  'Planning',
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  companySettings,
  onUpdateCompanySettings,
  users,
  currentUser,
  onSwitchUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  l1Data,
  l2Data,
  l3Data,
  onUpdateLevelOwner,
}) => {
  const isVi = language === 'vi';
  const isKo = language === 'ko';

  const [activeTab, setActiveTab] = useState<'users' | 'company' | 'levels' | 'language'>('users');

  // Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Company Settings Form State
  const [compName, setCompName] = useState(companySettings.companyName);
  const [compShortName, setCompShortName] = useState(companySettings.companyShortName);
  const [sysTitleVi, setSysTitleVi] = useState(companySettings.systemTitleVi);
  const [sysTitleEn, setSysTitleEn] = useState(companySettings.systemTitleEn);
  const [sysTitleKo, setSysTitleKo] = useState(companySettings.systemTitleKo);
  const [fiscalYear, setFiscalYear] = useState(companySettings.fiscalYear);
  const [logoSubtitle, setLogoSubtitle] = useState(companySettings.logoSubtitle || '');
  const [monolingualOnly, setMonolingualOnly] = useState(companySettings.monolingualOnly);

  // Level Owners Form State
  const [l1Owner, setL1Owner] = useState(l1Data.owner);
  const [l1Rev, setL1Rev] = useState(l1Data.revDate);
  const [l1TitleVi, setL1TitleVi] = useState(l1Data.titleVi);
  const [l1TitleEn, setL1TitleEn] = useState(l1Data.title);

  const [l2Owner, setL2Owner] = useState(l2Data.owner);
  const [l2Rev, setL2Rev] = useState(l2Data.revDate);
  const [l2TitleVi, setL2TitleVi] = useState(l2Data.titleVi);
  const [l2TitleEn, setL2TitleEn] = useState(l2Data.title);

  const [l3Owner, setL3Owner] = useState(l3Data.owner);
  const [l3Rev, setL3Rev] = useState(l3Data.revDate);
  const [l3TitleVi, setL3TitleVi] = useState(l3Data.titleVi);
  const [l3TitleEn, setL3TitleEn] = useState(l3Data.title);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<UserAccount>>({
    fullName: '',
    username: '',
    email: '',
    department: 'Lean',
    role: 'editor',
    levelAccess: ['L1', 'L2', 'L3'],
    departmentAccess: ['ALL'],
    permissions: {
      canEditKpi: true,
      canEditMonthly: true,
      canDelete: false,
      canExport: true,
      canManageUsers: false,
      canManageSettings: false,
    },
    isActive: true,
  });

  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompanySettings = {
      companyName: compName.trim() || 'Vietnam Samho Co., Ltd',
      companyShortName: compShortName.trim() || 'SAMHO',
      systemTitleVi: sysTitleVi.trim() || 'Hệ thống Hoạch định & Triển khai Chính sách (Hoshin Kanri)',
      systemTitleEn: sysTitleEn.trim() || 'Policy Deployment System (Hoshin Kanri)',
      systemTitleKo: sysTitleKo.trim() || '방침관리 전개 시스템 (Hoshin Kanri)',
      fiscalYear: fiscalYear.trim() || '2026',
      logoSubtitle: logoSubtitle.trim(),
      monolingualOnly,
    };
    onUpdateCompanySettings(updated);
    showToast(isVi ? 'Đã lưu cấu hình công ty thành công!' : 'Company settings saved successfully!');
  };

  const handleSaveLevelOwners = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLevelOwner('L1', l1Owner.trim(), l1Rev.trim(), l1TitleVi.trim(), l1TitleEn.trim());
    onUpdateLevelOwner('L2', l2Owner.trim(), l2Rev.trim(), l2TitleVi.trim(), l2TitleEn.trim());
    onUpdateLevelOwner('L3', l3Owner.trim(), l3Rev.trim(), l3TitleVi.trim(), l3TitleEn.trim());
    showToast(isVi ? 'Đã cập nhật tên Owner và tiêu đề các cấp độ!' : 'Level owners updated successfully!');
  };

  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserFormData({
      fullName: '',
      username: '',
      email: '',
      department: 'Lean',
      role: 'editor',
      levelAccess: ['L1', 'L2', 'L3'],
      departmentAccess: ['ALL'],
      permissions: {
        canEditKpi: true,
        canEditMonthly: true,
        canDelete: false,
        canExport: true,
        canManageUsers: false,
        canManageSettings: false,
      },
      isActive: true,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserAccount) => {
    setEditingUserId(u.id);
    setUserFormData({ ...u });
    setIsUserModalOpen(true);
  };

  const handleSaveUserModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.fullName?.trim() || !userFormData.username?.trim()) {
      alert(isVi ? 'Vui lòng nhập họ tên và tên tài khoản!' : 'Please enter full name and username!');
      return;
    }

    if (editingUserId) {
      const updated: UserAccount = {
        ...(userFormData as UserAccount),
        id: editingUserId,
      };
      onUpdateUser(updated);
      showToast(isVi ? 'Đã cập nhật thông tin tài khoản!' : 'Account updated successfully!');
    } else {
      const newUser: UserAccount = {
        id: `user-${Date.now()}`,
        username: userFormData.username.trim(),
        fullName: userFormData.fullName.trim(),
        email: userFormData.email?.trim() || `${userFormData.username.trim()}@samho.com`,
        department: userFormData.department || 'Lean',
        role: userFormData.role || 'editor',
        levelAccess: userFormData.levelAccess || ['L1', 'L2', 'L3'],
        departmentAccess: userFormData.departmentAccess || ['ALL'],
        permissions: userFormData.permissions || {
          canEditKpi: true,
          canEditMonthly: true,
          canDelete: false,
          canExport: true,
          canManageUsers: false,
          canManageSettings: false,
        },
        isActive: userFormData.isActive ?? true,
        createdAt: new Date().toISOString(),
      };
      onAddUser(newUser);
      showToast(isVi ? 'Đã thêm tài khoản mới thành công!' : 'New account created successfully!');
    }
    setIsUserModalOpen(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'level_owner':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'team_lead':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'editor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'viewer':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return isVi ? 'Quản trị viên (Toàn quyền)' : 'Admin (Full Access)';
      case 'level_owner':
        return isVi ? 'Chủ quản Cấp độ (Level Owner)' : 'Level Owner';
      case 'team_lead':
        return isVi ? 'Trưởng Bộ phận (Team Lead)' : 'Team Lead';
      case 'editor':
        return isVi ? 'Người chỉnh sửa (Editor)' : 'Editor';
      case 'viewer':
      default:
        return isVi ? 'Người xem (Chỉ đọc)' : 'Viewer (Read Only)';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isVi ? 'Cài Đặt & Quản Trị Hệ Thống' : isKo ? '시스템 설정 및 관리' : 'System Settings & Administration'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? 'Quản lý tài khoản người dùng, phân quyền, thông tin thương hiệu công ty và chủ quản các cấp độ Hoshin Kanri'
                : 'Manage user accounts, permissions, company branding, and Hoshin Kanri policy level owners'}
            </p>
          </div>
        </div>

        {/* Current Logged-in User Switcher Bar */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              {isVi ? 'Đang Đăng Nhập:' : 'Current User:'}
            </div>
            <span className="font-bold text-slate-900">{currentUser.fullName}</span>
            <span className="text-slate-500 ml-1">({currentUser.role})</span>
          </div>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const target = users.find((u) => u.id === e.target.value);
              if (target) {
                onSwitchUser(target);
                showToast(isVi ? `Đã chuyển sang tài khoản ${target.fullName}` : `Switched to ${target.fullName}`);
              }
            }}
            className="ml-2 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.department} - {u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>{isVi ? '1. Tài Khoản & Phân Quyền' : '1. Accounts & Permissions'}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'users' ? 'bg-slate-800 text-blue-300' : 'bg-slate-200 text-slate-700'}`}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'company'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>{isVi ? '2. Tên Công Ty & Thương Hiệu' : '2. Company & Branding'}</span>
        </button>

        <button
          onClick={() => setActiveTab('levels')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'levels'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span>{isVi ? '3. Chủ Quản Các Cấp Độ (Level Owners)' : '3. Level Owners & Revision'}</span>
        </button>

        <button
          onClick={() => setActiveTab('language')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'language'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Globe2 className="w-4 h-4 text-amber-400" />
          <span>{isVi ? '4. Chế Độ Hiển Thị Ngôn Ngữ' : '4. Language Display Mode'}</span>
        </button>
      </div>

      {/* TAB 1: User & Permissions Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                {isVi ? 'Danh Sách Tài Khoản & Cấp Quyền Truy Cập' : 'User Accounts & Access Control'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isVi
                  ? 'Tạo tài khoản mới, phân cấp quyền hạn chỉnh sửa KPI, nhập số liệu hàng tháng hoặc xem báo cáo theo từng bộ phận'
                  : 'Create accounts, assign KPI editing, monthly data entry, or read-only view access per department'}
              </p>
            </div>
            <button
              onClick={handleOpenAddUser}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Tạo Tài Khoản Mới' : 'Create Account'}</span>
            </button>
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Họ và Tên / Tài Khoản</th>
                  <th className="p-3">Bộ Phận</th>
                  <th className="p-3">Vai Trò</th>
                  <th className="p-3">Quyền Truy Cập Cấp Độ</th>
                  <th className="p-3">Quyền Hạn Chi Tiết</th>
                  <th className="p-3 text-center">Trạng Thái</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => {
                  const teamColor = getTeamColorConfig(u.department);
                  const isCurrent = u.id === currentUser.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isCurrent ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-semibold">
                                  {isVi ? 'Bạn' : 'You'}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-[11px] font-mono">
                              @{u.username} • {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono inline-block ${teamColor.badge}`}
                        >
                          {u.department}
                        </span>
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border inline-block ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          {getRoleLabel(u.role)}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center space-x-1">
                          {u.levelAccess.map((lvl) => (
                            <span
                              key={lvl}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-bold text-[10px] border border-slate-200"
                            >
                              {lvl}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.permissions.canEditKpi && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                              Sửa KPI
                            </span>
                          )}
                          {u.permissions.canEditMonthly && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                              Nhập Số Liệu
                            </span>
                          )}
                          {u.permissions.canDelete && (
                            <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-medium">
                              Xóa
                            </span>
                          )}
                          {u.permissions.canExport && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                              Xuất File
                            </span>
                          )}
                          {u.permissions.canManageUsers && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-medium">
                              Quản Lý User
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.isActive ? (isVi ? 'Hoạt Động' : 'Active') : (isVi ? 'Khóa' : 'Disabled')}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title={isVi ? 'Chỉnh sửa phân quyền' : 'Edit permissions'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {users.length > 1 && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    isVi
                                      ? `Bạn có chắc muốn xóa tài khoản "${u.fullName}"?`
                                      : `Delete account "${u.fullName}"?`
                                  )
                                ) {
                                  onDeleteUser(u.id);
                                  showToast(isVi ? 'Đã xóa tài khoản!' : 'Account deleted!');
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title={isVi ? 'Xóa tài khoản' : 'Delete account'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Company Branding & System Name */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompanySettings} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              {isVi ? 'Thông Tin Công Ty & Nhận Diện Thương Hiệu' : 'Company Information & Branding'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? 'Tên công ty và tiêu đề hệ thống sẽ hiển thị trên thanh Header, báo cáo xuất bản và sơ đồ X-Matrix'
                : 'Company name and title will be applied to the Header, export reports, and X-Matrix'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Tên Công Ty Đầy Đủ (Company Full Name):' : 'Full Company Name:'}
              </label>
              <input
                type="text"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="Ví dụ: Vietnam Samho Co., Ltd"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {isVi ? 'Hiển thị trên logo huy hiệu và tiêu đề trang' : 'Displayed on brand badge and main header'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Tên Viết Tắt / Mã Công Ty (Short Code):' : 'Short Code / Brand:'}
              </label>
              <input
                type="text"
                value={compShortName}
                onChange={(e) => setCompShortName(e.target.value)}
                placeholder="Ví dụ: SAMHO"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Tiêu Đề Hệ Thống (Tiếng Việt):' : 'System Title (Vietnamese):'}
              </label>
              <input
                type="text"
                value={sysTitleVi}
                onChange={(e) => setSysTitleVi(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Tiêu Đề Hệ Thống (English):' : 'System Title (English):'}
              </label>
              <input
                type="text"
                value={sysTitleEn}
                onChange={(e) => setSysTitleEn(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Tiêu Đề Hệ Thống (한국어 - Korean):' : 'System Title (Korean):'}
              </label>
              <input
                type="text"
                value={sysTitleKo}
                onChange={(e) => setSysTitleKo(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Năm Kế Hoạch / Năm Tài Chính (Fiscal Year):' : 'Fiscal Year:'}
              </label>
              <input
                type="text"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="2026"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isVi ? 'Lưu Thông Tin Công Ty' : 'Save Company Branding'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Policy Level Owners & Revision */}
      {activeTab === 'levels' && (
        <form onSubmit={handleSaveLevelOwners} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              {isVi ? 'Quản Lý Người Phụ Trách & Thông Tin Các Cấp Độ' : 'Policy Level Owners & Revisions'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? 'Đổi tên Người phụ trách (Owner), ngày sửa đổi (Rev Date) và tiêu đề cho từng cấp độ L1, L2, L3'
                : 'Configure Owner names, revision dates, and titles for L1, L2, and L3 policy deployment levels'}
            </p>
          </div>

          {/* Level 1 Config Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="px-2.5 py-1 bg-red-600 text-white rounded font-bold font-mono text-xs">
                Level 1 (Top Level Policy)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Cấp Công Ty Toàn Tập Đoàn</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Người Phụ Trách L1 (Owner):' : 'L1 Owner:'}
                </label>
                <input
                  type="text"
                  value={l1Owner}
                  onChange={(e) => setL1Owner(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Ngày Sửa Đổi (Rev Date):' : 'Rev Date:'}
                </label>
                <input
                  type="text"
                  value={l1Rev}
                  onChange={(e) => setL1Rev(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Tiêu Đề L1 (Tiếng Việt):' : 'L1 Title (VI):'}
                </label>
                <input
                  type="text"
                  value={l1TitleVi}
                  onChange={(e) => setL1TitleVi(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Tiêu Đề L1 (English):' : 'L1 Title (EN):'}
                </label>
                <input
                  type="text"
                  value={l1TitleEn}
                  onChange={(e) => setL1TitleEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Level 2 Config Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="px-2.5 py-1 bg-red-600 text-white rounded font-bold font-mono text-xs">
                Level 2 (Second Level Policy)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Cấp Trưởng Bộ Phận / Khối</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Người Phụ Trách L2 (Owner):' : 'L2 Owner:'}
                </label>
                <input
                  type="text"
                  value={l2Owner}
                  onChange={(e) => setL2Owner(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Ngày Sửa Đổi (Rev Date):' : 'Rev Date:'}
                </label>
                <input
                  type="text"
                  value={l2Rev}
                  onChange={(e) => setL2Rev(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Tiêu Đề L2 (Tiếng Việt):' : 'L2 Title (VI):'}
                </label>
                <input
                  type="text"
                  value={l2TitleVi}
                  onChange={(e) => setL2TitleVi(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Tiêu Đề L2 (English):' : 'L2 Title (EN):'}
                </label>
                <input
                  type="text"
                  value={l2TitleEn}
                  onChange={(e) => setL2TitleEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Level 3 Config Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="px-2.5 py-1 bg-red-600 text-white rounded font-bold font-mono text-xs">
                Level 3 (Third Level Policy)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Cấp Xưởng / Chuyền / Section</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Người Phụ Trách L3 (Owner):' : 'L3 Owner:'}
                </label>
                <input
                  type="text"
                  value={l3Owner}
                  onChange={(e) => setL3Owner(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Ngày Sửa Đổi (Rev Date):' : 'Rev Date:'}
                </label>
                <input
                  type="text"
                  value={l3Rev}
                  onChange={(e) => setL3Rev(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Tiêu Đề L3 (Tiếng Việt):' : 'L3 Title (VI):'}
                </label>
                <input
                  type="text"
                  value={l3TitleVi}
                  onChange={(e) => setL3TitleVi(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isVi ? 'Tiêu Đề L3 (English):' : 'L3 Title (EN):'}
                </label>
                <input
                  type="text"
                  value={l3TitleEn}
                  onChange={(e) => setL3TitleEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isVi ? 'Cập Nhật Owner Các Cấp Độ' : 'Save Level Owners'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: Language Display Mode */}
      {activeTab === 'language' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-amber-600" />
              {isVi ? 'Cấu Hình Hiển Thị Ngôn Ngữ (Đơn Ngữ vs Song Ngữ)' : 'Language Display Preferences'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? 'Yêu cầu: Khi nhấn vào ngôn ngữ nào, tất cả các nội dung chỉ show đúng ngôn ngữ đó, không hiển thị song ngữ.'
                : 'Requirement: When selecting a language, only that selected language is shown without bilingual subtitles.'}
            </p>
          </div>

          <div className="space-y-4">
            <div
              onClick={() => {
                setMonolingualOnly(true);
                onUpdateCompanySettings({ ...companySettings, monolingualOnly: true });
                showToast(isVi ? 'Đã kích hoạt chế độ Đơn ngữ thuần túy!' : 'Pure monolingual mode enabled!');
              }}
              className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start space-x-3 ${
                monolingualOnly
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  monolingualOnly ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                }`}
              >
                {monolingualOnly && <Check className="w-3 h-3" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>{isVi ? 'Chế độ Đơn ngữ thuần túy (Khuyên dùng)' : 'Pure Monolingual Mode (Recommended)'}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {isVi ? 'Chuẩn Doanh Nghiệp' : 'Active'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isVi
                    ? 'Khi chọn Tiếng Việt (VI), hệ thống chỉ hiển thị Tiếng Việt. Khi chọn Tiếng Anh (EN), chỉ hiển thị Tiếng Anh. Khi chọn Tiếng Hàn (KO), chỉ hiển thị Tiếng Hàn. Tuyệt đối không hiển thị phụ đề song ngữ hay mã nhãn khác bên dưới.'
                    : 'Selecting Vietnamese displays only Vietnamese text. Selecting English displays only English text. Selecting Korean displays only Korean text. No secondary bilingual subtitles.'}
                </p>
              </div>
            </div>

            <div
              onClick={() => {
                setMonolingualOnly(false);
                onUpdateCompanySettings({ ...companySettings, monolingualOnly: false });
                showToast(isVi ? 'Đã bật chế độ phụ đề song ngữ!' : 'Bilingual mode enabled!');
              }}
              className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start space-x-3 ${
                !monolingualOnly
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  !monolingualOnly ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                }`}
              >
                {!monolingualOnly && <Check className="w-3 h-3" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {isVi ? 'Chế độ Phụ đề Song ngữ / Đa ngữ' : 'Bilingual / Multilingual Subtitles Mode'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isVi
                    ? 'Hiển thị ngôn ngữ chính kèm theo phụ đề tiếng Anh hoặc tiếng Việt nhỏ bên dưới để đối chiếu song ngữ.'
                    : 'Shows primary language with secondary English or Vietnamese translations underneath for cross-reference.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">
                  {editingUserId
                    ? isVi
                      ? 'Chỉnh Sửa Quyền Hạn Tài Khoản'
                      : 'Edit Account & Permissions'
                    : isVi
                    ? 'Tạo Tài Khoản Mới & Cấp Quyền'
                    : 'Create New Account'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserModal} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Họ và Tên Nhân Sự:' : 'Full Name:'}
                  </label>
                  <input
                    type="text"
                    value={userFormData.fullName || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Tên Đăng Nhập (Username):' : 'Username:'}
                  </label>
                  <input
                    type="text"
                    value={userFormData.username || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    placeholder="nguyen.an"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Email Doanh Nghiệp:' : 'Email:'}
                  </label>
                  <input
                    type="email"
                    value={userFormData.email || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="nguyen.an@samho.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isVi ? 'Bộ Phận / Functional Team:' : 'Department:'}
                  </label>
                  <select
                    value={userFormData.department || 'Lean'}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Vai Trò Hệ Thống (System Role):' : 'System Role:'}
                </label>
                <select
                  value={userFormData.role || 'editor'}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    let perms = { ...userFormData.permissions! };
                    if (newRole === 'admin') {
                      perms = {
                        canEditKpi: true,
                        canEditMonthly: true,
                        canDelete: true,
                        canExport: true,
                        canManageUsers: true,
                        canManageSettings: true,
                      };
                    } else if (newRole === 'viewer') {
                      perms = {
                        canEditKpi: false,
                        canEditMonthly: false,
                        canDelete: false,
                        canExport: true,
                        canManageUsers: false,
                        canManageSettings: false,
                      };
                    }
                    setUserFormData({ ...userFormData, role: newRole, permissions: perms });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="admin">Quản trị viên (Admin - Toàn quyền)</option>
                  <option value="level_owner">Chủ quản Cấp độ (Level Owner)</option>
                  <option value="team_lead">Trưởng Bộ phận (Team Lead)</option>
                  <option value="editor">Người nhập liệu & cập nhật (Editor)</option>
                  <option value="viewer">Người xem (Viewer - Chỉ đọc)</option>
                </select>
              </div>

              {/* Specific Permissions Checkboxes */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <span className="block text-xs font-bold text-slate-800 mb-1">
                  {isVi ? 'Chi Tiết Quyền Hạn Cấp Cho Tài Khoản:' : 'Granular Permissions:'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions?.canEditKpi ?? true}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions!,
                            canEditKpi: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Chỉnh sửa thông tin KPI</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions?.canEditMonthly ?? true}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions!,
                            canEditMonthly: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Nhập số liệu Target/Actual hàng tháng</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions?.canDelete ?? false}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions!,
                            canDelete: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Xóa chỉ số KPI hoặc mục tiêu</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions?.canExport ?? true}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions!,
                            canExport: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Xuất báo cáo CSV / Excel</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions?.canManageUsers ?? false}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions!,
                            canManageUsers: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Quản lý & Cấp quyền User</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions?.canManageSettings ?? false}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions!,
                            canManageSettings: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Đổi tên Công ty & Owner các cấp</span>
                  </label>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-bold text-slate-700">
                  {isVi ? 'Trạng thái hoạt động tài khoản:' : 'Account Active Status:'}
                </label>
                <button
                  type="button"
                  onClick={() => setUserFormData({ ...userFormData, isActive: !userFormData.isActive })}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    userFormData.isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {userFormData.isActive ? 'Đang Hoạt Động (Active)' : 'Đã Khóa (Disabled)'}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-sm cursor-pointer"
                >
                  {isVi ? 'Lưu Tài Khoản' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
