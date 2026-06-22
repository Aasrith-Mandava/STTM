import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./state/store.ts";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import UploadIdentifier from "./pages/UploadIdentifier";
import ProfilingResult from "./pages/ProfilingResult";
import DefineDataDictionary from "./pages/DefineDataDictionary";
import DefineMetaData from "./pages/DefineMetaData.tsx";
import Sessions from "./pages/Sessions.tsx";
import Mapping from "./pages/Mapping.tsx";
import { ChatProvider } from "./components/ChatContext.tsx";
import Extract from "./pages/extract/Extract.tsx";
import Documentation from "./pages/Documentation.tsx";
import Settings from "./pages/Settings.tsx";

import "./App.css";


const router = createBrowserRouter([
  {
    path: "/",
    // Standalone app: no login. The app loads straight to the Dashboard.
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "upload",
        element: <UploadIdentifier />,
      },
      {
        path: "extract",
        element: <Extract />,
      },
      {
        path: "profiling",
        element: <ProfilingResult  />,
      },
      {
        path: "dictionary",
        element: <DefineDataDictionary />,
      },
      {
        path: "metadata",
        element: <DefineMetaData />,
      },
      {
        path: "sessions",
        element: <Sessions />,
      },
      {
        path: "mapping",
        element: <Mapping />,
      },
      {
        path: "documentation",
        element: <Documentation />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        // Any unknown/removed route (e.g. old /streaming-* links) -> dashboard.
        path: "*",
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);

export default function App() {
  return (
    <Provider store={store}>
      <ChatProvider>
        <RouterProvider router={router} />
      </ChatProvider>
    </Provider>
  );
}
