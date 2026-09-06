import { FC, useState } from 'react';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface SchedulePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSchedule: (scheduledTimeIso: string) => void;
}

const getTomorrowDateStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const SchedulePopover: FC<SchedulePopoverProps> = ({
  isOpen,
  onClose,
  onSelectSchedule,
}) => {
  const tomorrowStr = getTomorrowDateStr();

  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [selectedHour, setSelectedHour] = useState<string>('10');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
  const [selectedAmpm, setSelectedAmpm] = useState<'AM' | 'PM'>('AM');

  if (!isOpen) return null;

  const presets = [
    { label: 'Tomorrow', date: tomorrowStr, hour: '09', minute: '00', ampm: 'AM' as const },
    { label: 'Tomorrow, 10:00 AM', date: tomorrowStr, hour: '10', minute: '00', ampm: 'AM' as const },
    { label: 'Tomorrow, 11:00 AM', date: tomorrowStr, hour: '11', minute: '00', ampm: 'AM' as const },
    { label: 'Tomorrow, 3:00 PM', date: tomorrowStr, hour: '03', minute: '00', ampm: 'PM' as const },
  ];

  const handleApplyPreset = (
    date: string,
    hour: string,
    minute: string,
    ampm: 'AM' | 'PM'
  ) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedAmpm(ampm);
  };

  const handleDone = () => {
    let h = parseInt(selectedHour, 10);
    if (isNaN(h)) h = 12;
    if (selectedAmpm === 'PM' && h < 12) h += 12;
    if (selectedAmpm === 'AM' && h === 12) h = 0;

    const hStr = String(h).padStart(2, '0');
    const mStr = String(selectedMinute).padStart(2, '0');

    const isoString = new Date(`${selectedDate}T${hStr}:${mStr}:00`).toISOString();
    onSelectSchedule(isoString);
    onClose();
  };

  const hoursOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );
  const minutesOptions = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, '0')
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl max-w-sm w-full p-5 relative animate-in fade-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <Clock className="w-4 h-4 text-green-600" />
            <span>Send Later</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date & 12-Hour Time Controls */}
        <div className="space-y-3.5 mb-4">
          {/* Date Picker */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Select Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 12-Hour Time Selector (Hour, Minute, AM/PM) */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Select Time (12-Hour Format)
            </label>
            <div className="flex items-center gap-2">
              {/* Hour Dropdown */}
              <div className="flex-1">
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2 text-sm text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                >
                  {hoursOptions.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-gray-400 font-bold text-sm">:</span>

              {/* Minute Dropdown */}
              <div className="flex-1">
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2 text-sm text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                >
                  {minutesOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* AM / PM Selector */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-md border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedAmpm('AM')}
                  className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all ${
                    selectedAmpm === 'AM'
                      ? 'bg-white text-green-700 shadow-xs border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAmpm('PM')}
                  className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all ${
                    selectedAmpm === 'PM'
                      ? 'bg-white text-green-700 shadow-xs border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Time selected:{' '}
              <strong className="text-gray-700 font-semibold">
                {selectedHour}:{selectedMinute} {selectedAmpm}
              </strong>
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wider">
            Quick Presets
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {presets.map((preset, idx) => {
              const isSelected =
                selectedDate === preset.date &&
                selectedHour === preset.hour &&
                selectedMinute === preset.minute &&
                selectedAmpm === preset.ampm;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    handleApplyPreset(preset.date, preset.hour, preset.minute, preset.ampm)
                  }
                  className={`text-left px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-green-50 text-green-800 border border-green-200 font-semibold'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleDone}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
