import { useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

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
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    const isValidDate = (dateString: string) => {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime()) && dateString.length === 10;
    };

    const debouncedStartDateChange = useDebouncedCallback(
        (newDate: string) => {
            if (newDate !== startDate && isValidDate(newDate)) {
                onStartDateChange(newDate);
            }
        },
        750
    );

    const debouncedEndDateChange = useDebouncedCallback(
        (newDate: string) => {
            if (newDate !== endDate && isValidDate(newDate)) {
                onEndDateChange(newDate);
            }
        },
        750
    );

    const handleStartDateChange = () => {
        if (startDateRef.current) {
            debouncedStartDateChange(startDateRef.current.value);
        }
    };

    const handleEndDateChange = () => {
        if (endDateRef.current) {
            debouncedEndDateChange(endDateRef.current.value);
        }
    };

    return (
        <div className="flex gap-4 items-center mb-4 dark:text-gray-300">
            <div>
                <label className="block text-sm font-medium mb-1">From</label>
                <input
                    ref={startDateRef}
                    type="date"
                    defaultValue={startDate}
                    onChange={handleStartDateChange}
                    max={endDate}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <input
                    ref={endDateRef}
                    type="date"
                    defaultValue={endDate}
                    onChange={handleEndDateChange}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
            </div>
        </div>
    );
};
