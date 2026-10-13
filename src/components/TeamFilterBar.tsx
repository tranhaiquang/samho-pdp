import React from 'react';
import { Language, KpiItem, ResourcePerson } from '../types';
import { getTeamOptions, TeamOptionItem } from '../lib/teamUtils';
import {
  Building2,
  Zap,
  Briefcase,
  ShieldCheck,
  Cog,
  FlaskConical,
  HeartHandshake,
  Monitor,
  Truck,
  Users,
  Calendar,
  Filter,
} from 'lucide-react';

interface TeamFilterBarProps {
  selectedTeam: string;
  onSelectTeam: (team: string) => void;
  kpis: KpiItem[];
  resources?: ResourcePerson[];
  language: Language;
  className?: string;
  compact?: boolean;
}

const renderTeamIcon = (iconName: string, className = 'w-3.5 h-3.5') => {
  switch (iconName) {
    case 'Zap':
      return <Zap className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Cog':
      return <Cog className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'HeartHandshake':
      return <HeartHandshake className={className} />;
    case 'Monitor':
      return <Monitor className={className} />;
    case 'Truck':
      return <Truck className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    case 'Building2':
    default:
      return <Building2 className={className} />;
  }
};

export const TeamFilterBar: React.FC<TeamFilterBarProps> = ({
  selectedTeam,
  onSelectTeam,
  kpis,
  resources = [],
  language,
  className = '',
}) => {
  const isVi = language === 'vi';
  const teamOptions: TeamOptionItem[] = getTeamOptions(kpis, resources, language);

  return (
    <div
      className={`bg-white rounded-xl shadow-xs border border-slate-200/90 p-3 sm:p-3.5 mb-5 ${className}`}
    >
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mr-1 shrink-0 bg-slate-100/90 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Team:</span>
        </div>

        {teamOptions.map((opt) => {
          const isSelected =
            selectedTeam === opt.id ||
            (opt.id === 'ALL' && (!selectedTeam || selectedTeam === 'ALL'));
          const { meta, count } = opt;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectTeam(opt.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs rounded-lg transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? meta.colorClass.active
                  : meta.colorClass.inactive
              }`}
              title={
                opt.id === 'ALL'
                  ? isVi
                    ? 'Hiển thị tất cả các team'
                    : 'Show all teams'
                  : isVi
                  ? `Chỉ hiển thị team ${opt.label}`
                  : `Show only ${opt.label}`
              }
            >
              <span className="shrink-0">{renderTeamIcon(meta.iconName, 'w-3.5 h-3.5')}</span>
              <span className="font-semibold whitespace-nowrap">{opt.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                  isSelected
                    ? meta.colorClass.badgeActive
                    : meta.colorClass.badgeInactive
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
