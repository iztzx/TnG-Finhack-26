import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Radio, CheckCircle, Clock, Package, ChevronRight, RefreshCw, Globe2, Satellite, MapPinned, ShieldCheck
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { WS_URL } from '../lib/constants';

const mockShipments = [
  {
    id: 'SHP-7781',
    origin: 'Port Klang, Malaysia',
    destination: 'Singapore Port, Singapore',
    partner: 'Maersk Line',
    status: 'IN_TRANSIT',
    customsStatus: 'CLEARED',
    eta: '2026-05-01T12:00:00Z',
    progress: 65,
    coverage: { satellite: 'Updated 12 min ago', partnerApi: 'Live', customs: 'Verified' },
    waypoints: [
      { location: 'Port Klang, MY', status: 'completed', timestamp: '2026-04-01T08:00:00Z' },
      { location: 'Malacca Strait', status: 'completed', timestamp: '2026-04-02T14:30:00Z' },
      { location: 'Singapore Port', status: 'current', timestamp: '2026-04-03T09:00:00Z' },
    ],
  },
  {
    id: 'SHP-9923',
    origin: 'Johor Bahru, Malaysia',
    destination: 'Tanjong Pagar, Singapore',
    partner: 'DHL Global Forwarding',
    status: 'CUSTOMS_HOLD',
    customsStatus: 'PENDING_INSPECTION',
    eta: '2026-04-28T16:00:00Z',
    progress: 40,
    coverage: { satellite: 'Updated 22 min ago', partnerApi: 'Delayed', customs: 'Under review' },
    waypoints: [
      { location: 'Johor Bahru Customs', status: 'completed', timestamp: '2026-04-10T06:00:00Z' },
      { location: 'Woodlands Checkpoint', status: 'current', timestamp: '2026-04-10T10:00:00Z' },
      { location: 'Tanjong Pagar, SG', status: 'pending', timestamp: '' },
    ],
  },
  {
    id: 'SHP-4451',
    origin: 'Penang, Malaysia',
    destination: 'Changi Logistics Hub, Singapore',
    partner: 'FedEx Trade Networks',
    status: 'DELIVERED',
    customsStatus: 'RELEASED',
    eta: '2026-04-15T11:00:00Z',
    progress: 100,
    coverage: { satellite: 'Final snapshot stored', partnerApi: 'Delivered', customs: 'Released' },
    waypoints: [
      { location: 'Penang Port, MY', status: 'completed', timestamp: '2026-04-12T07:00:00Z' },
      { location: 'Ipoh Transit Hub', status: 'completed', timestamp: '2026-04-13T16:00:00Z' },
      { location: 'KL Central Warehouse', status: 'completed', timestamp: '2026-04-14T08:00:00Z' },
      { location: 'Changi Hub, SG', status: 'completed', timestamp: '2026-04-15T11:00:00Z' },
    ],
  },
  {
    id: 'SHP-6632',
    origin: 'Kota Kinabalu, Malaysia',
    destination: 'Manila Port, Philippines',
    partner: 'CMA CGM',
    status: 'IN_TRANSIT',
    customsStatus: 'CLEARED',
    eta: '2026-05-05T08:00:00Z',
    progress: 30,
    coverage: { satellite: 'Updated 34 min ago', partnerApi: 'Live', customs: 'Verified' },
    waypoints: [
      { location: 'KK Port, Sabah', status: 'completed', timestamp: '2026-04-20T06:00:00Z' },
      { location: 'Sulu Sea', status: 'current', timestamp: '2026-04-22T14:00:00Z' },
      { location: 'Manila Port, PH', status: 'pending', timestamp: '' },
    ],
  },
];

const statusConfig = {
  IN_TRANSIT: { label: 'In Transit', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500 animate-pulse' },
  CUSTOMS_HOLD: { label: 'Customs Hold', color: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  ARRIVED: { label: 'Arrived', color: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
};

export default function Shipments() {
  const [selectedShipment, setSelectedShipment] = useState(mockShipments[0]);
  const [shipments] = useState(mockShipments);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const { isConnected } = useWebSocket(WS_URL);
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
    } finally {
      setRefreshing(false);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2000);
    }
  };

  const totalWaypoints = selectedShipment.waypoints.length;
  let activeIndex = selectedShipment.waypoints.map((w) => w.status).lastIndexOf('current');
  if (activeIndex === -1) {
    activeIndex = selectedShipment.waypoints.map((w) => w.status).lastIndexOf('completed');
  }
  const progressPercent = totalWaypoints > 1 ? (Math.max(0, activeIndex) / (totalWaypoints - 1)) * 100 : 0;

  const topStats = [
    {
      label: 'Active shipments',
      value: shipments.filter((s) => s.status !== 'DELIVERED').length,
      icon: Truck,
      color: 'text-tng-blue',
      onClick: () => setSelectedShipment(shipments.find((s) => s.status !== 'DELIVERED') || shipments[0]),
    },
    {
      label: 'On-time rate',
      value: '92%',
      icon: Clock,
      color: 'text-green-600',
      onClick: () => navigate('/analytics'),
    },
    {
      label: 'Customs cleared',
      value: '75%',
      icon: CheckCircle,
      color: 'text-purple-600',
      onClick: () => setSelectedShipment(shipments.find((s) => s.customsStatus === 'CLEARED') || shipments[0]),
    },
    {
      label: 'Avg transit time',
      value: '3.2 days',
      icon: Package,
      color: 'text-amber-600',
      onClick: () => navigate('/transactions'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipment Tracker</h1>
          <p className="mt-1 text-sm text-gray-500">Satellite imagery, customs milestones and shipping partner location feeds in one view</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} ${refreshSuccess ? 'text-green-500' : ''}`} />
            {refreshSuccess ? 'Updated' : 'Refresh view'}
          </button>
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5">
            <Radio className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-amber-500'} ${refreshing ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium text-gray-600">{isConnected ? 'Live data feeds' : 'Fallback data'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topStats.map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="flex items-center gap-4 rounded-[28px] border border-white/70 bg-white/88 p-5 text-left shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-tng-blue/20 hover:shadow-md"
          >
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Tracked shipments</h2>
            <button onClick={() => navigate('/financing')} className="text-sm font-medium text-tng-blue hover:underline">Finance shipment</button>
          </div>
          <div className="space-y-3">
            {shipments.map((shipment) => {
              const cfg = statusConfig[shipment.status] || statusConfig.IN_TRANSIT;
              return (
                <button
                  key={shipment.id}
                  onClick={() => setSelectedShipment(shipment)}
                  className={`w-full rounded-[28px] border p-4 text-left transition-all ${
                    selectedShipment.id === shipment.id
                      ? 'border-tng-blue bg-tng-blue/5 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-900">{shipment.id}</p>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">{shipment.origin} → {shipment.destination}</p>
                      <p className="mt-1 truncate text-xs text-gray-400">{shipment.partner}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-tng-blue" style={{ width: `${shipment.progress}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedShipment.id}</h2>
                <p className="text-sm text-gray-500">{selectedShipment.partner} · {selectedShipment.origin} → {selectedShipment.destination}</p>
              </div>
              <div className="flex gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${(statusConfig[selectedShipment.status] || statusConfig.IN_TRANSIT).color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${(statusConfig[selectedShipment.status] || statusConfig.IN_TRANSIT).dot}`} />
                  {(statusConfig[selectedShipment.status] || statusConfig.IN_TRANSIT).label}
                </span>
                <button
                  onClick={() => navigate('/financing')}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Finance this lane
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
              <div className="relative px-4 py-8">
                <div className="relative z-10 flex items-start justify-between">
                  {selectedShipment.waypoints.map((wp, idx) => (
                    <button key={idx} className="flex flex-col items-center text-center">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        wp.status === 'completed'
                          ? 'border-green-500 bg-green-500'
                          : wp.status === 'current'
                          ? 'border-tng-blue bg-tng-blue'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {wp.status === 'completed' && <CheckCircle className="h-3 w-3 text-white" />}
                        {wp.status === 'current' && <div className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                      </div>
                      <p className="mt-2 max-w-[90px] text-[10px] font-medium leading-tight text-gray-600">{wp.location}</p>
                      <p className="mt-0.5 text-[9px] text-gray-400">
                        {wp.timestamp ? new Date(wp.timestamp).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }) : 'Pending'}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="absolute left-[26px] right-[26px] top-[41px] -z-0 h-0.5 bg-gray-200">
                  <div className="absolute left-0 top-0 h-full bg-tng-blue transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <button className="rounded-3xl bg-gray-50 p-4 text-left">
                <p className="text-xs text-gray-500">Customs status</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{selectedShipment.customsStatus}</p>
              </button>
              <button className="rounded-3xl bg-gray-50 p-4 text-left">
                <p className="text-xs text-gray-500">ETA</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{new Date(selectedShipment.eta).toLocaleDateString('en-MY')}</p>
              </button>
              <button className="rounded-3xl bg-gray-50 p-4 text-left">
                <p className="text-xs text-gray-500">Progress</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{selectedShipment.progress}% complete</p>
              </button>
              <button onClick={() => navigate('/analytics')} className="rounded-3xl bg-gray-50 p-4 text-left hover:bg-gray-100">
                <p className="text-xs text-gray-500">Open analytics</p>
                <p className="mt-1 text-sm font-semibold text-tng-blue">View route performance</p>
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Verification sources</h3>
              <button onClick={() => navigate('/architecture')} className="text-sm font-medium text-tng-blue hover:underline">View data flow</button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <button className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4 text-left hover:bg-slate-50">
                <Satellite className="mb-3 h-5 w-5 text-emerald-600" />
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Satellite imagery</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedShipment.coverage.satellite}</p>
              </button>
              <button className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4 text-left hover:bg-slate-50">
                <MapPinned className="mb-3 h-5 w-5 text-blue-600" />
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Partner location API</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedShipment.coverage.partnerApi}</p>
              </button>
              <button className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4 text-left hover:bg-slate-50">
                <ShieldCheck className="mb-3 h-5 w-5 text-violet-600" />
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Customs evidence</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedShipment.coverage.customs}</p>
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <button className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4 text-left hover:bg-slate-50">
                <Globe2 className="mb-3 h-5 w-5 text-cyan-600" />
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Route integrity</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">All latest waypoints align across independent sources.</p>
              </button>
              <button onClick={() => navigate('/financing')} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4 text-left hover:bg-slate-50">
                <Package className="mb-3 h-5 w-5 text-amber-600" />
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Use for financing</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Launch shipment financing using the verified movement history.</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
