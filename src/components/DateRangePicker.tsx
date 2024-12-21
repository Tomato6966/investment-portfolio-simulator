

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) => {
  return (
    <div className="flex gap-4 items-center mb-4 dark:text-gray-300">
      <div>
        <label className="block text-sm font-medium mb-1">From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          max={endDate}
          className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          min={startDate}
          max={new Date().toISOString().split('T')[0]}
          className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
        />
      </div>
    </div>
  );
};
