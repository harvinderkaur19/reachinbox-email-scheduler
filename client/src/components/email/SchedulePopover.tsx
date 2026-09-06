import { FC, useState } from 'react';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface SchedulePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSchedule: (scheduledTimeIso: string) => void;
}

export const SchedulePopover: FC<SchedulePopoverProps> = ({
  isOpen,
  onClose,
  onSelectSchedule,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-07');
  const [selectedTime, setSelectedTime] = useState<string>('10:00');

  if (!isOpen) return null;

  const presets = [
    { label: 'Tomorrow', date: '2026-09-07', time: '09:00' },
    { label: 'Tomorrow, 10:00 AM', date: '2026-09-07', time: '10:00' },
    { label: 'Tomorrow, 11:00 AM', date: '2026-09-07', time: '11:00' },
    { label: 'Tomorrow, 3:00 PM', date: '2026-09-07', time: '15:00' },
  ];

  const handleApplyPreset = (dateStr: string, timeStr: string) => {
    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
  };

  const handleDone = () => {
    const isoString = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
    onSelectSchedule(isoString);
    onClose();
  };

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
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date & Time Picker */}
        <div className="space-y-3 mb-4">
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

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Select Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
              <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wider">
            Quick Presets
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset.date, preset.time)}
                className={`text-left px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  selectedDate === preset.date && selectedTime === preset.time
                    ? 'bg-green-50 text-green-800 border border-green-200 font-semibold'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
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
