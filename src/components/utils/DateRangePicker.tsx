import { format, isValid, parseISO } from "date-fns";
import { useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

interface DateRangePickerProps {
    startDate: Date;
    endDate: Date;
    onStartDateChange: (date: Date) => void;
    onEndDateChange: (date: Date) => void;
}

export const DateRangePicker = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
}: DateRangePickerProps) => {
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    const formatDateToISO = (date: Date) => {
        return format(date, 'yyyy-MM-dd');
    };

    const isValidDate = (dateString: string) => {
        const parsed = parseISO(dateString);
        return isValid(parsed);
    };

    const debouncedStartDateChange = useDebouncedCallback(
        (dateString: string) => {
            if (isValidDate(dateString)) {
                const newDate = new Date(Date.UTC(
                    parseISO(dateString).getUTCFullYear(),
                    parseISO(dateString).getUTCMonth(),
                    parseISO(dateString).getUTCDate()
                ));

                if (newDate.getTime() !== startDate.getTime()) {
                    onStartDateChange(newDate);
                }
            }
        },
        750
    );

    const debouncedEndDateChange = useDebouncedCallback(
        (dateString: string) => {
            if (isValidDate(dateString)) {
                const newDate = new Date(Date.UTC(
                    parseISO(dateString).getUTCFullYear(),
                    parseISO(dateString).getUTCMonth(),
                    parseISO(dateString).getUTCDate()
                ));

                if (newDate.getTime() !== endDate.getTime()) {
                    onEndDateChange(newDate);
                }
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
                    defaultValue={formatDateToISO(startDate)}
                    onChange={handleStartDateChange}
                    max={formatDateToISO(endDate)}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
                    lang="de"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <input
                    ref={endDateRef}
                    type="date"
                    defaultValue={formatDateToISO(endDate)}
                    onChange={handleEndDateChange}
                    min={formatDateToISO(startDate)}
                    max={formatDateToISO(new Date())}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
                    lang="de"
                />
            </div>
        </div>
    );
};
