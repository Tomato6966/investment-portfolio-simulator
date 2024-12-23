import { lazy, Suspense, useState } from "react";

import { AppShell } from "./components/Landing/AppShell";
import { LoadingPlaceholder } from "./components/utils/LoadingPlaceholder";
import { PortfolioProvider } from "./providers/PortfolioProvider";

const MainContent = lazy(() => import("./components/Landing/MainContent"));

export default function App() {
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
        </PortfolioProvider>
    );
}
