import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";

import { useLocaleDateFormat } from "../../hooks/useLocalDateFormat";
import { DateRange } from "../../types";
import { intervalBasedOnDateRange } from "../../utils/calculations/intervalBasedOnDateRange";

interface DateRangePickerProps {
    startDate: Date;
    endDate: Date;
    onDateRangeChange: (dateRange: DateRange) => void;
}

export const DateRangePicker = ({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) => {
    const [localStartDate, setLocalStartDate] = useState<Date>(startDate);
    const [localEndDate, setLocalEndDate] = useState<Date>(endDate);
    const [hasChanges, setHasChanges] = useState(false);
    const [startDateText, setStartDateText] = useState(format(startDate, 'yyyy-MM-dd'));
    const [endDateText, setEndDateText] = useState(format(endDate, 'yyyy-MM-dd'));
    
    const localeDateFormat = useLocaleDateFormat();
    
    // Update local state when props change
    useEffect(() => {
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
        setStartDateText(format(startDate, 'yyyy-MM-dd'));
        setEndDateText(format(endDate, 'yyyy-MM-dd'));
        setHasChanges(false);
    }, [startDate, endDate]);

    const handleLocalStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        setStartDateText(dateValue);
        
        try {
            const newDate = new Date(dateValue);
            if (!isNaN(newDate.getTime())) {
                setLocalStartDate(newDate);
                setHasChanges(true);
            }
        } catch (error) {
            console.error("Invalid date format", error);
        }
    };

    const handleLocalEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        setEndDateText(dateValue);
        
        try {
            const newDate = new Date(dateValue);
            if (!isNaN(newDate.getTime())) {
                setLocalEndDate(newDate);
                setHasChanges(true);
            }
        } catch (error) {
            console.error("Invalid date format", error);
        }
    };

    const handleApplyChanges = () => {
        setHasChanges(false);
        // Update the date range
        onDateRangeChange({ startDate: localStartDate, endDate: localEndDate });
    };
    return (
        <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Start Date <p className="text-xs text-gray-500">({localeDateFormat})</p>
                </label>
                <input
                    type="date"
                    value={startDateText}
                    onChange={handleLocalStartDateChange}
                    className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full"
                />
            </div>
            <div className="flex-1">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    End Date <p className="text-xs text-gray-500">({localeDateFormat}) <span className="text-red-500/30 italic text-[10px]">Data-Fetching-Interval ({intervalBasedOnDateRange({ startDate: localStartDate, endDate: localEndDate })})</span></p>
                </label>
                <input
                    type="date"
                    value={endDateText}
                    onChange={handleLocalEndDateChange}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full"
                />
            </div>
            <button
                onClick={handleApplyChanges}
                disabled={!hasChanges}
                title="Apply date range"
                className="h-10 flex items-center justify-center p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Check className="w-4 h-4" />
            </button>
        </div>
    );
};
