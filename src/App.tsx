import { Moon, Plus, Sun } from "lucide-react";
import React, { useState } from "react";

import { AddAssetModal } from "./components/AddAssetModal";
import { InvestmentFormWrapper } from "./components/InvestmentForm";
import { PortfolioChart } from "./components/PortfolioChart";
import { PortfolioTable } from "./components/PortfolioTable";
import { useDarkMode } from "./providers/DarkModeProvider";

export default function App() {
    const [isAddingAsset, setIsAddingAsset] = useState(false);
    const { isDarkMode, toggleDarkMode } = useDarkMode();

    return (
        <div className={`app ${isDarkMode ? 'dark' : ''}`}>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8 transition-colors">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold dark:text-white">Portfolio Simulator</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Toggle dark mode"
                        >
                            {isDarkMode ? (
                                <Sun className="w-5 h-5 text-yellow-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-gray-600" />
                            )}
                        </button>
                        <button
                            onClick={() => setIsAddingAsset(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            <Plus className="w-5 h-5" />
                            Add Asset
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-8 mb-8 dark:text-gray-300">
                    <div className="col-span-3">
                        <PortfolioChart/>
                    </div>
                    <div className="col-span-1">
                        <InvestmentFormWrapper />
                    </div>
                </div>

                <PortfolioTable />
                {isAddingAsset && <AddAssetModal onClose={() => setIsAddingAsset(false)} />}
                </div>
            </div>
        </div>
    );
}
