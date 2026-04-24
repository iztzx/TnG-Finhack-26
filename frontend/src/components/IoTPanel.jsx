import { MapPin, Battery, Wifi, Thermometer } from 'lucide-react';

export default function IoTPanel({ data = {
  gps: { lat: 3.1390, lng: 101.6869, location: 'Kuala Lumpur' },
  battery: 87,
  signal: 4,
  temperature: 32.5,
} }) {
  const signalBars = [1, 2, 3, 4, 5];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Device Telemetry</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">GPS</p>
            <p className="text-sm font-medium text-gray-900">{data.gps.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50">
            <Battery className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Battery</p>
            <p className="text-sm font-medium text-gray-900">{data.battery}%</p>
          </div>
          <div className="ml-auto w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${data.battery > 20 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${data.battery}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-50">
            <Wifi className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Signal</p>
            <div className="flex items-end gap-0.5 mt-1">
              {signalBars.map((bar) => (
                <div
                  key={bar}
                  className={`w-1 rounded-sm ${bar <= data.signal ? 'bg-purple-500' : 'bg-gray-200'}`}
                  style={{ height: `${bar * 4}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50">
            <Thermometer className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Temperature</p>
            <p className="text-sm font-medium text-gray-900">{data.temperature}°C</p>
          </div>
          <span className={`ml-auto w-2 h-2 rounded-full ${
            data.temperature > 40 ? 'bg-red-500' : data.temperature > 35 ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
        </div>
      </div>
    </div>
  );
}
