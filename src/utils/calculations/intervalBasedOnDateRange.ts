import { DateRange } from "../../types";

// const validIntervals = [ "1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo" ];

export const intervalBasedOnDateRange = (dateRange: DateRange, withSubDays: boolean = false) => {
    const { startDate, endDate } = dateRange;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // if diffDays is sub 1 year, it should be 1d, if it's 1-2 years it should be 2d, if it's 2-3 years it should be 3days, and so on
    const oneYear = 360;
    if(withSubDays && diffDays <= 60) return "60m";
    if(withSubDays && diffDays > 60 && diffDays < 100) return "1h";
    if(diffDays < oneYear * 2.5) return "1d";
    if(diffDays < oneYear * 6 && diffDays >= oneYear * 2.5) return "5d";
    if(diffDays < oneYear * 15 && diffDays >= oneYear * 6) return "1wk";
    if(diffDays >= oneYear * 30) return "1mo";
    return "1d";
}

