import { useMemo } from "react";

export const useLocaleDateFormat = () => {
    return useMemo(() => {
        const formatter = new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });

        const testDate = new Date(2024, 0, 1);
        const formattedParts = formatter.formatToParts(testDate);

        const order = formattedParts
            .filter(part => part.type !== 'literal') // Entferne Trennzeichen
            .map(part => part.type);

        return order.join('/').toUpperCase().replace(/DAY/g, 'DD').replace(/MONTH/g, 'MM').replace(/YEAR/g, 'YYYY');
    }, []);
};
