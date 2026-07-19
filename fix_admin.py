#!/usr/bin/env python3
"""Fix admin dashboard issues"""

import re

filepath = '/Users/djfredmax/Desktop/Deck Salone/app/src/pages/AdminDashboard.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Replace BellDropdownContent with improved version that has clear all
old_bell = '''function BellDropdownContent() {
  const { data: notifications, isLoading } = useAdminNotifications({ limit: 10 });

  if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 text-[#D4A24A] animate-spin" /></div>;
  if (!notifications || notifications.length === 0) return <p className="text-xs text-text-muted text-center py-4">No new notifications</p>;

  return (
    <>
      {notifications.map((n: any) => (
        <div key={n.id} className="rounded-xl p-2.5 border border-white/5 bg-white/[0.02] flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: n.type === 'verification' ? 'rgba(249,115,22,0.1)' : n.type === 'booking' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)' }}>
            {n.type === 'verification' ? <AlertTriangle className="w-3 h-3 text-orange-400" /> : n.type === 'booking' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Bell className="w-3 h-3 text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-text-primary truncate">{n.title}</p>
            <p className="text-[10px] text-text-muted truncate">{n.message}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '--'}</p>
          </div>
        </div>
      ))}
    </>
  );
}'''

new_bell = '''function AdminBellDropdown({ setBellOpen }: { setBellOpen: (v: boolean) => void }) {
  const { data: notifications, isLoading } = useAdminNotifications({ limit: 10 });
  const markAllRead = useMarkAllNotificationsRead();
  const clearAll = useClearAllNotifications();
  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b theme-border-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-text-primary">Notifications</p>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-[#D4A24A]/20 text-[#D4A24A] px-1.5 py-0.5 rounded-full">{unreadCount} new</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); markAllRead.mutate(); }}
              disabled={markAllRead.isPending}
              className="text-[10px] text-text-muted hover:text-text-primary px-1.5 py-0.5"
              title="Mark all read"
            >
              {markAllRead.isPending ? '...' : 'Mark read'}
            </button>
          )}
          {notifications && notifications.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearAll.mutate(); }}
              disabled={clearAll.isPending}
              className="text-[10px] text-red hover:text-red/80 px-1.5 py-0.5"
              title="Clear all"
            >
              {clearAll.isPending ? '...' : 'Clear all'}
            </button>
          )}
          <button onClick={() => setBellOpen(false)} className="text-[10px] text-text-muted hover:text-text-primary px-1.5 py-0.5">Close</button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-72 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 text-[#D4A24A] animate-spin" /></div>
        ) : !notifications || notifications.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">No notifications</p>
        ) : (
          notifications.map((n: any) => (
            <div key={n.id} className={`rounded-xl p-2.5 border border-white/5 flex items-start gap-2.5 ${!n.read ? 'bg-[#D4A24A]/5' : 'bg-white/[0.02]'}`}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: n.type === 'verification' ? 'rgba(249,115,22,0.1)' : n.type === 'booking' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)' }}>
                {n.type === 'verification' ? <AlertTriangle className="w-3 h-3 text-orange-400" /> : n.type === 'booking' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Bell className="w-3 h-3 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${!n.read ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>{n.title}</p>
                <p className="text-[10px] text-text-muted truncate">{n.message}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '--'}</p>
              </div>
              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#D4A24A] flex-shrink-0 mt-1" />}
            </div>
          ))
        )}
      </div>
    </>
  );
}'''

if old_bell in content:
    content = content.replace(old_bell, new_bell)
    print("✓ Replaced BellDropdownContent with AdminBellDropdown")
else:
    print("✗ Could not find BellDropdownContent to replace")

# 2. Replace the bell dropdown call site
old_call = '''              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border theme-border-card shadow-xl overflow-hidden z-50 theme-bg-elevated">
                  <div className="p-3 border-b theme-border-card flex items-center justify-between">
                    <p className="text-xs font-bold text-text-primary">Notifications</p>
                    <button onClick={() => setBellOpen(false)} className="text-[10px] text-text-muted hover:text-text-primary">Close</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2 space-y-2">
                    <BellDropdownContent />
                  </div>
                </div>
              )}'''

new_call = '''              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border theme-border-card shadow-xl overflow-hidden z-50 theme-bg-elevated">
                  <AdminBellDropdown setBellOpen={setBellOpen} />
                </div>
              )}'''

if old_call in content:
    content = content.replace(old_call, new_call)
    print("✓ Updated bell dropdown call site")
else:
    print("✗ Could not find bell dropdown call site to replace")

with open(filepath, 'w') as f:
    f.write(content)

print("Done!")
PYEOF
