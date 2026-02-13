"use client";

import { useState, useCallback } from "react";
import { useRoute } from "./router";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Content } from "./components/Content";
import { GettingStartedSection } from "./sections/GettingStartedSection";
import { ValidatorsSection } from "./sections/ValidatorsSection";
import { MiddlewareSection } from "./sections/MiddlewareSection";
import { ReusableChainsSection } from "./sections/ReusableChainsSection";
import { ZodSection } from "./sections/ZodSection";
import { PluginSection } from "./sections/PluginSection";

function PageContent() {
  const route = useRoute();

  if (route.name === false) {
    return <GettingStartedSection />;
  }

  switch (route.name) {
    case "gettingStarted":
      return <GettingStartedSection />;
    case "validation":
      return <ValidatorsSection />;
    case "middleware":
      return <MiddlewareSection />;
    case "reusableChains":
      return <ReusableChainsSection />;
    case "zodPlugin":
      return <ZodSection />;
    case "customPlugins":
      return <PluginSection />;
    default:
      return <GettingStartedSection />;
  }
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        <Content>
          <PageContent />
        </Content>
      </div>
    </div>
  );
}
