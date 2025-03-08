import { BarChart2, CircleChevronDown, CircleChevronUp, Heart, Menu, Moon, Plus, Sun, X } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";

import { useDarkMode } from "../../hooks/useDarkMode";

interface AppShellProps {
    children: React.ReactNode;
    onAddAsset: () => void;
}

export const AppShell = ({ children, onAddAsset }: AppShellProps) => {
    const { isDarkMode, toggleDarkMode } = useDarkMode();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(true);

    return (
        <div className={`app ${isDarkMode ? 'dark' : ''}`}>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 md:p-8 transition-colors relative">
                <div className="max-w-7xl mx-auto">
                    {/* Desktop Header */}
                    <div className="hidden md:flex justify-between items-center mb-6 md:mb-8">
                        <h1 className="text-xl sm:text-2xl font-bold dark:text-white">Portfolio Simulator</h1>
                        <div className="flex gap-2 md:gap-4">
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
                                className="flex items-center gap-1 md:gap-2 bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded text-sm md:text-base hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                Add Asset
                            </button>
                            <Link
                                to="/explore"
                                className="flex items-center gap-1 bg-red-500/50 md:gap-2 px-3 py-2 md:px-4 md:py-2 text-sm md:text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            >
                                <BarChart2 className="w-4 h-4 md:w-5 md:h-5" />
                                Stock Explorer
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Header */}
                    <div className="md:hidden flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold dark:text-white">Portfolio Simulator</h1>
                        <div className="flex items-center gap-2">
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
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                                {mobileMenuOpen ? (
                                    <CircleChevronUp className="w-5 h-5 dark:text-gray-500" />
                                ) : (
                                    <CircleChevronDown className="w-5 h-5 dark:text-white" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4 flex flex-col gap-3">
                            <button
                                onClick={onAddAsset}
                                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
                            >
                                <Plus className="w-5 h-5" />
                                Add Asset
                            </button>
                            <Link
                                to="/explore"
                                className="flex items-center justify-center bg-red-500/50 gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded w-full border border-gray-200 dark:border-gray-700"
                            >
                                <BarChart2 className="w-5 h-5" />
                                Stock Explorer
                            </Link>
                        </div>
                    )}

                    {children}
                </div>

                <a
                    href="https://github.com/Tomato6966/investment-portfolio-simulator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-4 left-4 text-xs sm:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
                >
                    Built with <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 inline animate-pulse" /> by Tomato6966
                </a>
            </div>
        </div>
    );
};
