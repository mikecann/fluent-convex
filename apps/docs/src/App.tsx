"use client";

import { useCallback, useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Content } from "./components/Content";

export default function App() {
  const [activeSection, setActiveSection] = useState<string>("getting-started");
  const handleSectionChange = useCallback((id: string) => setActiveSection(id), []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeSection={activeSection} />
        <Content onSectionChange={handleSectionChange} />
      </div>
    </div>
  );
}
