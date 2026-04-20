'use client';
/**
 * Shared UI components — used by BOTH operator AND owner dashboards.
 * Moved from operator-specific usage to shared/ so owner pages can import them.
 */

import Link from 'next/link';

// ── AlertStatusBadge ──────────────────────────────────────────────────────────
const channelIcons: Record<string, string> = {
  call:     'call',
  sms:      'sms',
  whatsapp: 'chat_bubble',
  manual:   'person',
};

interface AlertStatusBadgeProps {
  channel: string;
  status:  'success' | 'failed' | string;
}

export function AlertStatusBadge({ channel, status }: AlertStatusBadgeProps) {
  const isSuccess = status === 'success';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-bold uppercase tracking-wider ${
        isSuccess
          ? 'bg-[#003a2e] text-[#7dffd4]'
          : 'bg-[#93000a]/30 text-[#ffb4ab]'
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">
        {channelIcons[channel] ?? 'notifications'}
      </span>
      {channel} · {status}
    </span>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    'bg-[#002516]/60 text-[#7dffd4] border border-[#7dffd4]/30',
    scheduled: 'bg-[#0b3c5d]/60 text-[#a3cbf2] border border-[#a3cbf2]/30',
    completed: 'bg-[#1c2024] text-[#8c9198] border border-[#42474e]/30',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[0.6875rem] font-bold uppercase tracking-widest ${styles[status] ?? styles.completed}`}>
      {status}
    </span>
  );
}

// ── TripTable ─────────────────────────────────────────────────────────────────
export interface TripRow {
  id:             string;
  status:         string;
  scheduled_date: string;
  started_at?:    string | null;
  created_at?:    string;
  operator_name?: string;   // shown only when showOperator=true
  route?:         { name?: string; from_city?: string; to_city?: string };
  conductor?:     { name?: string };
  passenger_count?: number;
}

interface TripTableProps {
  trips:        TripRow[];
  basePath:     string;  // e.g. /operator/trips or /owner/trips
  showOperator: boolean; // owner sees operator name column
}

export function TripTable({ trips, basePath, showOperator }: TripTableProps) {
  if (!trips.length) {
    return (
      <div className="py-16 text-center text-[#8c9198] bg-[#181c20] rounded-xl">
        <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">directions_bus</span>
        <p className="text-sm">No trips found.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
            <th className="px-6 pb-2">Route</th>
            {showOperator && <th className="px-6 pb-2">Operator</th>}
            <th className="px-6 pb-2">Date</th>
            <th className="px-6 pb-2">Status</th>
            <th className="px-6 pb-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id} className="bg-[#181c20] hover:bg-[#1c2024] transition-colors">
              <td className="px-6 py-4 rounded-l-xl font-bold text-[#e0e2e8] text-sm">
                {trip.route
                  ? `${trip.route.from_city} → ${trip.route.to_city}`
                  : <span className="text-[#8c9198]">—</span>}
              </td>
              {showOperator && (
                <td className="px-6 py-4 text-sm text-[#c2c7ce]">
                  {trip.operator_name ?? '—'}
                </td>
              )}
              <td className="px-6 py-4 text-xs font-mono text-[#8c9198]">
                {trip.scheduled_date}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={trip.status} />
              </td>
              <td className="px-6 py-4 rounded-r-xl text-right">
                <Link
                  href={`${basePath}/${trip.id}`}
                  className="text-xs text-[#a3cbf2] hover:underline uppercase tracking-wider"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── LogsTable ─────────────────────────────────────────────────────────────────
export interface LogRow {
  id:              string;
  channel:         string;
  status:          string;
  attempted_at:    string;
  passenger_name:  string;
  passenger_phone: string;
  error_message?:  string | null;
  operator_name?:  string;
}

interface LogsTableProps {
  logs:         LogRow[];
  showOperator: boolean;
}

export function LogsTable({ logs, showOperator }: LogsTableProps) {
  if (!logs.length) {
    return (
      <div className="py-16 text-center text-[#8c9198] bg-[#181c20] rounded-xl">
        <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">receipt_long</span>
        <p className="text-sm">No alert logs found.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
            <th className="px-6 pb-2">Passenger</th>
            {showOperator && <th className="px-6 pb-2">Operator</th>}
            <th className="px-6 pb-2">Channel</th>
            <th className="px-6 pb-2">Status</th>
            <th className="px-6 pb-2">Time</th>
            <th className="px-6 pb-2">Error</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="bg-[#181c20] hover:bg-[#1c2024] transition-colors">
              <td className="px-6 py-4 rounded-l-xl">
                <p className="font-bold text-sm text-[#e0e2e8]">{log.passenger_name}</p>
                <p className="text-xs text-[#8c9198] font-mono">{log.passenger_phone}</p>
              </td>
              {showOperator && (
                <td className="px-6 py-4 text-sm text-[#c2c7ce]">{log.operator_name ?? '—'}</td>
              )}
              <td className="px-6 py-4">
                <AlertStatusBadge channel={log.channel} status={log.status} />
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={log.status === 'success' ? 'active' : 'completed'} />
              </td>
              <td className="px-6 py-4 text-xs font-mono text-[#8c9198]">
                {new Date(log.attempted_at).toLocaleTimeString('en-IN')}
              </td>
              <td className="px-6 py-4 rounded-r-xl text-xs text-[#ffb4ab] max-w-[200px] truncate">
                {log.error_message ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── MemberCard ────────────────────────────────────────────────────────────────
export interface MemberRow {
  id:         string;
  name:       string;
  phone:      string;
  role:       string;
  is_active:  boolean;
  created_at: string;
  trips_created_count?: number;
  last_active_at?:      string | null;
}

interface MemberCardProps {
  member:    MemberRow;
  onToggle?: (id: string, current: boolean) => void;
}

export function MemberCard({ member, onToggle }: MemberCardProps) {
  const initials = member.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-[#181c20] rounded-xl p-5 flex gap-4 hover:bg-[#1c2024] transition-colors">
      {/* Avatar */}
      <div className="h-12 w-12 rounded-full bg-[#0b3c5d] text-[#a3cbf2] font-bold text-sm flex items-center justify-center flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-sm text-[#e0e2e8]">{member.name}</p>
            <p className="text-xs font-mono text-[#8c9198]">{member.phone}</p>
          </div>
          {/* Active toggle */}
          {onToggle && (
            <button
              onClick={() => onToggle(member.id, member.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                member.is_active ? 'bg-[#a3cbf2]' : 'bg-[#42474e]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  member.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="flex gap-4 mt-2">
          <span className="text-[0.6875rem] uppercase tracking-wider text-[#c2c7ce]/60">
            {member.role}
          </span>
          {member.trips_created_count !== undefined && (
            <span className="text-[0.6875rem] text-[#c2c7ce]/60">
              {member.trips_created_count} trips
            </span>
          )}
          {member.last_active_at && (
            <span className="text-[0.6875rem] text-[#c2c7ce]/60">
              Last: {new Date(member.last_active_at).toLocaleDateString('en-IN')}
            </span>
          )}
          <span
            className={`text-[0.6875rem] uppercase tracking-wider font-bold ${
              member.is_active ? 'text-[#7dffd4]' : 'text-[#8c9198]'
            }`}
          >
            {member.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}
