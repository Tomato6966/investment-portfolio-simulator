import "jspdf-autotable";

import { jsPDF } from "jspdf";

import { Asset } from "../types";
import { calculateFutureProjection } from "./calculations/futureProjection";

// Add type augmentation for the autotable plugin
interface jsPDFWithPlugin extends jsPDF {
    autoTable: (options: any) => void;
}

const formatEuro = (value: number) => {
    return `€${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace(".", ",").replace(/,(\d{3})/g, ".$1")}`;
};

export const downloadTableAsCSV = (tableData: any[], filename: string) => {
    const headers = Object.keys(tableData[0])
        .filter(header => !header.toLowerCase().includes('id'));

    const csvContent = [
        headers.map(title => title.charAt(0).toUpperCase() + title.slice(1)).join(','),
        ...tableData.map(row =>
            headers.map(header => {
                const value = row[header]?.toString().replace(/,/g, '');
                return isNaN(Number(value))
                    ? `"${value}"`
                    : formatEuro(Number(value)).replace('€', '');
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
};

export const generatePortfolioPDF = async (
    assets: Asset[],
    performance: any,
    savingsPlansPerformance: any[],
    performancePerAnno: number
) => {
    const doc = new jsPDF() as jsPDFWithPlugin;
    doc.setFont('Arial', 'normal');
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Portfolio Analysis Report', 15, yPos);
    yPos += 15;

    // Explanations
    doc.setFontSize(12);
    doc.setTextColor(100);

    // TTWOR Explanation
    doc.text('Understanding TTWOR (Time Travel Without Risk):', 15, yPos);
    yPos += 7;
    const ttworText =
        'TTWOR shows how your portfolio would have performed if all investments had been made at ' +
        'the beginning of the period. This metric helps evaluate the impact of your investment ' +
        'timing strategy compared to a single early investment. A higher portfolio performance ' +
        'than TTWOR indicates successful timing of investments.';

    const ttworLines = doc.splitTextToSize(ttworText, 180);
    doc.text(ttworLines, 20, yPos);
    yPos += ttworLines.length * 7;

    doc.setTextColor(0);

    // Portfolio Summary
    doc.setFontSize(16);
    doc.text('Portfolio Summary', 15, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Invested: ${formatEuro(performance.summary.totalInvested)}`, 20, yPos);
    yPos += 7;
    doc.text(`Current Value: ${formatEuro(performance.summary.currentValue)}`, 20, yPos);
    yPos += 7;
    doc.text(`Performance: ${performance.summary.performancePercentage.toFixed(2)}% (p.a. ${performance.summary.performancePerAnnoPerformance.toFixed(2)}%)`, 20, yPos);
    yPos += 7;

    // TTWOR values in italic
    doc.setFont('Arial', 'italic');
    doc.text(`TTWOR* Value: ${formatEuro(performance.summary.ttworValue)} (would perform: ${performance.summary.ttworPercentage.toFixed(2)}%)`, 20, yPos);
    doc.setFont('Arial', 'normal');
    yPos += 15;

    // Add Positions Overview table
    doc.setFontSize(16);
    doc.text('Positions Overview', 15, yPos);
    yPos += 10;

    // Prepare positions data
    const positionsTableData = [
        // Summary row
        [
            'Total Portfolio',
            '',
            '',
            formatEuro(performance.summary.totalInvested),
            formatEuro(performance.summary.currentValue),
            '',
            `${performance.summary.performancePercentage.toFixed(2)}% (p.a. ${performance.summary.performancePerAnnoPerformance.toFixed(2)}%)`,
        ],
        // TTWOR row
        [
            'TTWOR*',
            '',
            performance.investments[0]?.date
                ? new Date(performance.investments[0].date).toLocaleDateString('de-DE')
                : '',
            formatEuro(performance.summary.totalInvested),
            formatEuro(performance.summary.ttworValue),
            '',
            `${performance.summary.ttworPercentage.toFixed(2)}%`,
        ],
        // Individual positions
        ...performance.investments.sort((a: any, b: any) => a.date.localeCompare(b.date)).map((inv: any) => {
            const asset = assets.find(a => a.name === inv.assetName)!;
            const investment = asset.investments.find(i => i.id === inv.id)! || inv;
            const filtered = performance.investments.filter((v: any) => v.assetName === inv.assetName);
            const avgBuyIn = filtered.reduce((acc: any, curr: any) => acc + curr.investedAtPrice, 0) / filtered.length;

            return [
                inv.assetName,
                investment.type === 'periodic' ? 'SavingsPlan' : 'OneTime',
                new Date(inv.date).toLocaleDateString('de-DE'),
                formatEuro(inv.investedAmount),
                formatEuro(inv.currentValue),
                `${formatEuro(inv.investedAtPrice)} (${formatEuro(avgBuyIn)})`,
                `${inv.performancePercentage.toFixed(2)}%`,
            ];
        }),
    ];

    doc.autoTable({
        startY: yPos,
        head: [['Asset', 'Type', 'Date', 'Invested Amount', 'Current Value', 'Buy-In (avg)', 'Performance']],
        body: positionsTableData,
        styles: {
            cellPadding: 2,
            fontSize: 8,
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
        },
        // Style for summary and TTWOR rows
        rowStyles: (row:number) => {
            if (row === 0) return { fontStyle: 'bold', fillColor: [245, 245, 245] };
            if (row === 1) return { fontStyle: 'italic', textColor: [100, 100, 100] };
            return {};
        },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Savings Plans Table if exists
    if (savingsPlansPerformance.length > 0) {
        doc.setFontSize(16);
        doc.text('Savings Plans Performance', 15, yPos);
        yPos += 10;

        const savingsPlansTableData = savingsPlansPerformance.map(plan => [
            plan.assetName,
            formatEuro(plan.amount),
            formatEuro(plan.totalInvested),
            formatEuro(plan.currentValue),
            `${plan.performancePercentage.toFixed(2)}%`,
            `${plan.performancePerAnnoPerformance.toFixed(2)}%`
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Asset', 'Interval Amount', 'Total Invested', 'Current Value', 'Performance', 'Performance (p.a.)']],
            body: savingsPlansTableData,
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Add page break before future projections
    doc.addPage();
    yPos = 20;

    // Future Projections
    doc.setFontSize(16);
    doc.text('Future Projections', 15, yPos);
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(100);
    // Future Projections Explanation
    doc.text('About Future Projections:', 15, yPos);
    yPos += 7;
    const projectionText =
        'The future projections are calculated using your portfolio\'s historical performance ' +
        `(${performancePerAnno.toFixed(2)}% p.a.) as a baseline. The chart shows different time horizons ` +
        'to help visualize potential growth scenarios. These projections are estimates based on ' +
        'historical data and should not be considered guaranteed returns.';

    doc.setTextColor(0);
    const projectionLines = doc.splitTextToSize(projectionText, 180);
    doc.text(projectionLines, 20, yPos);
    yPos += projectionLines.length * 7 - 7;


    const years = [10, 15, 20, 30, 40];
    const chartWidth = 180;
    const chartHeight = 100;

    // Calculate all projections first
    const allProjections = await Promise.all(years.map(async year => {
        const { projection } = await calculateFutureProjection(assets, year, performancePerAnno, {
            enabled: false,
            amount: 0,
            interval: 'monthly',
            startTrigger: 'date'
        });
        return { year, projection };
    }));

    // Show summary table
    const projectionSummary = allProjections.map(({ year, projection }) => {
        const projected = projection[projection.length - 1];
        return [
            `${year} Years`,
            formatEuro(projected.invested),
            formatEuro(projected.value),
            `${((projected.value - projected.invested) / projected.invested * 100).toFixed(2)}%`
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: [['Timeframe', 'Invested Amount', 'Expected Value', '% Gain']],
        body: projectionSummary,
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Draw combined chart
    const maxValue = Math.max(...allProjections.flatMap(p => p.projection.map(d => d.value)));
    const yAxisSteps = 5;
    const stepSize = maxValue / yAxisSteps;
    const legendHeight = 40; // Height for legend section

    // Draw axes
    doc.setDrawColor(200);
    doc.line(15, yPos, 15, yPos + chartHeight); // Y axis
    doc.line(15, yPos + chartHeight, 15 + chartWidth, yPos + chartHeight); // X axis

    // Draw Y-axis labels and grid lines
    doc.setFontSize(8);
    doc.setDrawColor(230);
    for (let i = 0; i <= yAxisSteps; i++) {
        const value = maxValue - (i * stepSize);
        const y = yPos + (i * (chartHeight / yAxisSteps));
        doc.text(formatEuro(value), 5, y + 3);
        doc.line(15, y, 15 + chartWidth, y); // Grid line
    }

    const colors: [number, number, number][] = [
        [0, 100, 255],   // Blue
        [255, 100, 0],   // Orange
        [0, 200, 100],   // Green
        [200, 0, 200],   // Purple
        [255, 0, 0],     // Red
    ];

    // Draw lines for each projection
    allProjections.forEach(({ projection }, index) => {
        const points = projection.map((p, i) => [
            15 + (i * (chartWidth / projection.length)),
            yPos + chartHeight - (p.value / maxValue * chartHeight)
        ]);

        doc.setDrawColor(...(colors[index]));
        doc.setLineWidth(0.5);
        points.forEach((point, i) => {
            if (i > 0) {
                doc.line(points[i - 1][0], points[i - 1][1], point[0], point[1]);
            }
        });
    });

    // Add date labels
    doc.setFontSize(8);
    doc.setDrawColor(0);

    // Draw legend at bottom
    const legendY = yPos + chartHeight + 20;
    const legendItemWidth = chartWidth / years.length;

    doc.setFontSize(8);
    allProjections.forEach(({ year }, index) => {
        const x = 15 + (index * legendItemWidth);

        // Draw color line
        doc.setDrawColor(...colors[index]);
        doc.setLineWidth(1);
        doc.line(x, legendY + 4, x + 15, legendY + 4);

        // Draw text
        doc.setTextColor(0);
        doc.text(`${year} Years`, x + 20, legendY + 6);
    });

    yPos += chartHeight + legendHeight; // Update yPos to include legend space

    // Add footer with link
    const footerText = 'Built by Tomato6966 - SourceCode';
    const link = 'https://github.com/Tomato6966/investment-portfolio-simulator';

    doc.setFontSize(10);
    doc.setTextColor(100);
    const pageHeight = doc.internal.pageSize.height;

    // Add to all pages
    // @ts-expect-error - doc.internal.getNumberOfPages() is not typed
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Footer text with link
        doc.text(footerText, 15, pageHeight - 10);

        // Add link annotation
        doc.link(15, pageHeight - 15, doc.getTextWidth(footerText), 10, { url: link });

        // Page numbers
        doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.width - 30, pageHeight - 10);
    }

    doc.save('portfolio-analysis.pdf');
};
