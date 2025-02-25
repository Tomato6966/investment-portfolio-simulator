import { lazy, Suspense } from "react";

import { LoadingPlaceholder } from "../utils/LoadingPlaceholder";

const AddAssetModal = lazy(() => import("../Modals/AddAssetModal"));
const InvestmentFormWrapper = lazy(() => import("../InvestmentForm"));
const PortfolioChart = lazy(() => import("../PortfolioChart"));
const PortfolioTable = lazy(() => import("../PortfolioTable"));


export default function MainContent({ isAddingAsset, setIsAddingAsset }: { isAddingAsset: boolean, setIsAddingAsset: (value: boolean) => void }) {
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8 dark:text-gray-300">
                <div className="col-span-3">
                    <Suspense fallback={<LoadingPlaceholder className="h-[500px]" />}>
                        <PortfolioChart />
                    </Suspense>
                </div>
                <div className="col-span-3 lg:col-span-1">
                    <Suspense fallback={<LoadingPlaceholder className="h-[500px]" />}>
                        <InvestmentFormWrapper />
                    </Suspense>
                </div>
            </div>
            <Suspense fallback={<LoadingPlaceholder className="h-[500px]" />}>
                <PortfolioTable />
            </Suspense>

            {isAddingAsset && (
                <Suspense>
                    <AddAssetModal onClose={() => setIsAddingAsset(false)} />
                </Suspense>
            )}
        </>
    );
};
