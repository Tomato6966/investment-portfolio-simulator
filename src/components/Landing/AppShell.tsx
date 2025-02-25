import { BarChart2, Heart, Moon, Plus, Sun } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

import { useDarkMode } from "../../hooks/useDarkMode";

interface AppShellProps {
    children: React.ReactNode;
    onAddAsset: () => void;
}

export const AppShell = ({ children, onAddAsset }: AppShellProps) => {
    const { isDarkMode, toggleDarkMode } = useDarkMode();

    return (
        <div className={`app ${isDarkMode ? 'dark' : ''}`}>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8 transition-colors relative">
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
                                onClick={onAddAsset}
                                className={`flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700`}
                            >
                                <Plus className="w-5 h-5" />
                                Add Asset
                            </button>
                            <Link
                                to="/explore"
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            >
                                <BarChart2 className="w-5 h-5" />
                                Stock Explorer
                            </Link>
                        </div>
                    </div>
                    {children}
                </div>

                <a
                    href="https://github.com/Tomato6966/investment-portfolio-simulator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-4 left-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
                >
                    Built with <Heart className="w-4 h-4 text-red-500 inline animate-pulse" /> by Tomato6966
                </a>
            </div>
        </div>
    );
};
