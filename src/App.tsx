import { lazy, Suspense, useState } from "react";
import { Toaster } from "react-hot-toast";

import { AppShell } from "./components/Landing/AppShell";
import { LoadingPlaceholder } from "./components/utils/LoadingPlaceholder";
import StockExplorer from "./pages/StockExplorer";
import { PortfolioProvider } from "./providers/PortfolioProvider";

const MainContent = lazy(() => import("./components/Landing/MainContent"));

function Root() {
    const [isAddingAsset, setIsAddingAsset] = useState(false);

    return (
        <PortfolioProvider>
            <AppShell onAddAsset={() => setIsAddingAsset(true)}>
                <Suspense fallback={<LoadingPlaceholder className="h-screen" />}>
                    <MainContent
                        isAddingAsset={isAddingAsset}
                        setIsAddingAsset={setIsAddingAsset}
                    />
                </Suspense>
            </AppShell>
            <Toaster position="bottom-right" />
        </PortfolioProvider>
    );
}

// Export the routes configuration that will be used in main.tsx
export default [
    {
        path: '/',
        element: <Root />
    },
    {
        path: '/explore',
        element: <StockExplorer />
    }
];
