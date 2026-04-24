import { useState } from 'react';
import {
  Truck, Radio, CheckCircle, Clock, Package,
  Thermometer, Battery, Wifi, ChevronRight, RefreshCw
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { WS_URL } from '../lib/constants';
import { trackShipment } from '../lib/api';

const mockShipments = [
  {
    id: 'SHP-7781',
    origin: 'Port Klang, Malaysia',
    destination: 'Singapore Port, Singapore',
    carrier: 'Maersk Line',
    status: 'IN_TRANSIT',
    customsStatus: 'CLEARED',
    eta: '2026-05-01T12:00:00Z',
    progress: 65,
    waypoints: [
      { location: 'Port Klang, MY', status: 'completed', timestamp: '2026-04-01T08:00:00Z' },
      { location: 'Malacca Strait', status: 'completed', timestamp: '2026-04-02T14:30:00Z' },
      { location: 'Singapore Port', status: 'current', timestamp: '2026-04-03T09:00:00Z' },
    ],
    sensor: { temp: 24.5, humidity: 62, battery: 92, signal: 4 },
  },
  {
    id: 'SHP-9923',
    origin: 'Johor Bahru, Malaysia',
    destination: 'Tanjon Pagar, Singapore',
    carrier: 'DHL Global Forwarding',
    status: 'CUSTOMS_HOLD',
    customsStatus: 'PENDING_INSPECTION',
    eta: '2026-04-28T16:00:00Z',
    progress: 40,
    waypoints: [
      { location: 'Johor Bahru Customs', status: 'completed', timestamp: '2026-04-10T06:00:00Z' },
      { location: 'Woodlands Checkpoint', status: 'current', timestamp: '2026-04-10T10:00:00Z' },
      { location: 'Tanjon Pagar, SG', status: 'pending', timestamp: '' },
    ],
    sensor: { temp: 28.1, humidity: 71, battery: 67, signal: 3 },
  },
  {
    id: 'SHP-4451',
    origin: 'Penang, Malaysia',
    destination: 'Changi Logistics Hub, Singapore',
    carrier: 'FedEx Trade Networks',
    status: 'DELIVERED',
    customsStatus: 'RELEASED',
    eta: '2026-04-15T11:00:00Z',
    progress: 100,
    waypoints: [
      { location: 'Penang Port, MY', status: 'completed', timestamp: '2026-04-12T07:00:00Z' },
      { location: 'Ipoh Transit Hub', status: 'completed', timestamp: '2026-04-13T16:00:00Z' },
      { location: 'KL Central Warehouse', status: 'completed', timestamp: '2026-04-14T08:00:00Z' },
      { location: 'Changi Hub, SG', status: 'completed', timestamp: '2026-04-15T11:00:00Z' },
    ],
    sensor: { temp: 22.0, humidity: 55, battery: 88, signal: 5 },
  },
  {
    id: 'SHP-6632',
    origin: 'Kota Kinabalu, Malaysia',
    destination: 'Manila Port, Philippines',
    carrier: 'CMA CGM',
    status: 'IN_TRANSIT',
    customsStatus: 'CLEARED',
    eta: '2026-05-05T08:00:00Z',
    progress: 30,
    waypoints: [
      { location: 'KK Port, Sabah', status: 'completed', timestamp: '2026-04-20T06:00:00Z' },
      { location: 'Sulu Sea', status: 'current', timestamp: '2026-04-22T14:00:00Z' },
      { location: 'Manila Port, PH', status: 'pending', timestamp: '' },
    ],
    sensor: { temp: 29.5, humidity: 78, battery: 45, signal: 2 },
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
  const { isConnected } = useWebSocket(WS_URL);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await trackShipment(selectedShipment.id);
      if (data && data.shipmentId) {
        setSelectedShipment((prev) => ({
          ...prev,
          status: data.status,
          customsStatus: data.customsStatus,
          waypoints: data.waypoints?.map((wp, i) => ({
            location: wp.location,
            status: i === data.waypoints.length - 1 ? 'current' : 'completed',
            timestamp: wp.timestamp,
          })) || prev.waypoints,
        }));
      }
    } catch {
      // keep mock data
    } finally {
      setRefreshing(false);
    }
  };

  const completedWaypoints = selectedShipment.waypoints.filter((w) => w.status === 'completed').length;
  const totalWaypoints = selectedShipment.waypoints.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipment Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time visibility into your shipments across SEA</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
            <Radio className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600">{isConnected ? 'Live' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Shipments', value: shipments.filter((s) => s.status !== 'DELIVERED').length, icon: Truck, color: 'text-tng-blue' },
          { label: 'On-Time Rate', value: '92%', icon: Clock, color: 'text-green-600' },
          { label: 'Customs Cleared', value: '75%', icon: CheckCircle, color: 'text-purple-600' },
          { label: 'Avg Transit Time', value: '3.2 days', icon: Package, color: 'text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipment List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Active Shipments</h2>
          <div className="space-y-3">
            {shipments.map((shipment) => {
              const cfg = statusConfig[shipment.status] || statusConfig.IN_TRANSIT;
              return (
                <button
                  key={shipment.id}
                  onClick={() => setSelectedShipment(shipment)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedShipment.id === shipment.id
                      ? 'border-tng-blue bg-tng-blue/5'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{shipment.id}</p>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{shipment.origin} → {shipment.destination}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-tng-blue rounded-full" style={{ width: `${shipment.progress}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tracking Detail */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedShipment.id}</h2>
                <p className="text-sm text-gray-500">{selectedShipment.carrier} · {selectedShipment.origin} → {selectedShipment.destination}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                (statusConfig[selectedShipment.status] || statusConfig.IN_TRANSIT).color
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${(statusConfig[selectedShipment.status] || statusConfig.IN_TRANSIT).dot}`} />
                {(statusConfig[selectedShipment.status] || statusConfig.IN_TRANSIT).label}
              </span>
            </div>

            {/* Visual Path */}
            <div className="relative py-8 px-4">
              <div className="flex items-start justify-between relative z-10">
                {selectedShipment.waypoints.map((wp, idx) => (
                  <div key={idx} className="flex flex-col items-center relative">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      wp.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : wp.status === 'current'
                        ? 'bg-tng-blue border-tng-blue'
                        : 'bg-white border-gray-300'
                    }`}>
                      {wp.status === 'completed' && <CheckCircle className="w-3 h-3 text-white" />}
                      {wp.status === 'current' && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2 text-center max-w-[90px] leading-tight font-medium">{wp.location}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{wp.timestamp ? new Date(wp.timestamp).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }) : 'Pending'}</p>
                  </div>
                ))}
              </div>
              <div className="absolute top-[39px] left-12 right-12 h-0.5 bg-gray-200 -z-0" />
              <div
                className="absolute top-[39px] left-12 h-0.5 bg-tng-blue -z-0 transition-all"
                style={{ width: `${totalWaypoints > 1 ? (completedWaypoints / (totalWaypoints - 1)) * 100 : 0}%` }}
              />
            </div>

            {/* Customs Status */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center gap-3">
              <Package className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Customs Clearance</p>
                <p className={`text-sm font-semibold ${
                  selectedShipment.customsStatus === 'CLEARED' || selectedShipment.customsStatus === 'RELEASED'
                    ? 'text-green-600'
                    : selectedShipment.customsStatus === 'PENDING_INSPECTION'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {selectedShipment.customsStatus}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">ETA</p>
                <p className="text-sm font-semibold text-gray-900">{new Date(selectedShipment.eta).toLocaleDateString('en-MY')}</p>
              </div>
            </div>
          </div>

          {/* Sensor Telemetry */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Shipment Monitoring Sensors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg flex flex-col items-center text-center">
                <Thermometer className="w-5 h-5 text-orange-500 mb-2" />
                <p className="text-xs text-gray-500">Temperature</p>
                <p className="text-lg font-bold text-gray-900">{selectedShipment.sensor.temp}°C</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg flex flex-col items-center text-center">
                <Package className="w-5 h-5 text-blue-500 mb-2" />
                <p className="text-xs text-gray-500">Humidity</p>
                <p className="text-lg font-bold text-gray-900">{selectedShipment.sensor.humidity}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg flex flex-col items-center text-center">
                <Battery className="w-5 h-5 text-green-500 mb-2" />
                <p className="text-xs text-gray-500">Device Battery</p>
                <p className="text-lg font-bold text-gray-900">{selectedShipment.sensor.battery}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg flex flex-col items-center text-center">
                <Wifi className="w-5 h-5 text-purple-500 mb-2" />
                <p className="text-xs text-gray-500">Signal</p>
                <div className="flex items-end gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 rounded-sm ${bar <= selectedShipment.sensor.signal ? 'bg-purple-500' : 'bg-gray-200'}`}
                      style={{ height: `${bar * 4}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
