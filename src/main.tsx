import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.tsx";
import { DarkModeProvider } from "./providers/DarkModeProvider.tsx";

// Let App handle the route definitions
const router = createBrowserRouter(App, {
    // for github pages...
    basename: process.env.CUSTOM_BASE_NAME || "investment-portfolio-simulator"
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <DarkModeProvider>
            <RouterProvider router={router} />
        </DarkModeProvider>
    </React.StrictMode>
);
