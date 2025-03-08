import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SortableTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: any) => React.ReactNode;
  }[];
}

export const SortableTable = ({ data, columns }: SortableTableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);

  const sortedData = React.useMemo(() => {
    // Create a copy of the data to avoid mutating the original
    let sortableData = [...data];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        // Handle null and undefined values
        if (a[sortConfig.key] == null) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (b[sortConfig.key] == null) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        // Handle numeric values
        if (typeof a[sortConfig.key] === 'number' && typeof b[sortConfig.key] === 'number') {
          return sortConfig.direction === 'ascending' 
            ? a[sortConfig.key] - b[sortConfig.key]
            : b[sortConfig.key] - a[sortConfig.key];
        }
        
        // Handle string values
        if (typeof a[sortConfig.key] === 'string' && typeof b[sortConfig.key] === 'string') {
          return sortConfig.direction === 'ascending'
            ? a[sortConfig.key].localeCompare(b[sortConfig.key])
            : b[sortConfig.key].localeCompare(a[sortConfig.key]);
        }
        
        // Fallback for other types
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig?.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100 dark:bg-slate-700">
          {columns.map((column) => (
            <th 
              key={column.key} 
              className={`p-2 text-left dark:text-gray-200 ${column.sortable !== false ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600' : ''}`}
              onClick={() => column.sortable !== false && requestSort(column.key)}
            >
              <div className="flex items-center">
                {column.label}
                {sortConfig?.key === column.key && (
                  <span className="ml-1">
                    {sortConfig.direction === 'ascending' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((row, index) => (
          <tr key={index} className="border-b dark:border-slate-600">
            {columns.map((column) => (
              <td key={column.key} className="p-2 dark:text-gray-200">
                {column.render ? column.render(row[column.key], row) : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}; 