import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  ClipboardCheck,
  Users,
  CreditCard,
  BellRing,
  BarChart3,
  Settings,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard'
  | 'scanner'
  | 'manual'
  | 'learners'
  | 'id_cards'
  | 'alerts'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingAlertsCount: number;
  totalLearnersCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingAlertsCount,
  totalLearnersCount
}) => {
  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: "Overview & today's logs"
    },
    {
      id: 'scanner' as ActiveTab,
      label: 'QR Scanner',
      icon: QrCode,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      description: 'Time-In & Time-Out camera'
    },
    {
      id: 'manual' as ActiveTab,
      label: 'Manual Log Mode',
      icon: ClipboardCheck,
      description: 'Teacher checklist & overrides'
    },
    {
      id: 'learners' as ActiveTab,
      label: 'Learner Management',
      icon: Users,
      count: totalLearnersCount,
      description: 'Student profiles & 12-digit LRN'
    },
    {
      id: 'id_cards' as ActiveTab,
      label: 'QR ID Card Studio',
      icon: CreditCard,
      description: 'Printable badges & barcodes'
    },
    {
      id: 'alerts' as ActiveTab,
      label: 'Parent Alerts',
      icon: BellRing,
      count: pendingAlertsCount > 0 ? pendingAlertsCount : undefined,
      countColor: 'bg-rose-500 text-white',
      description: 'Free SMS & Messenger alerts'
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'DepEd SF2 & Dropout Risk',
      icon: BarChart3,
      description: 'Official SF2 Excel, Risk & Heatmap'
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Backup & Cloud Sync',
      icon: Settings,
      description: 'Firestore & SQLite (.db) backup'
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Main Navigation
          </p>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md border ${
                        item.badgeColor || 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        item.countColor || (isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300')
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-slate-200">Hybrid Storage</p>
            <p className="text-[11px] text-slate-400">Offline SQLite + Firestore</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> SIRCAM v2.4
          </span>
          <span>100% Free Alerts</span>
        </div>
      </div>
    </aside>
  );
};
