"use client";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationsEditor, type IntegrationKeyState } from "@/components/admin/integrations-editor";
import { StatusTable, type ProviderStatusRow } from "@/components/admin/status-table";

export function CommandCenterTabs({
  keys,
  status,
}: {
  keys: IntegrationKeyState[];
  status: ProviderStatusRow[];
}) {
  const [tab, setTab] = useState<string>("integrations");
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="status">Status</TabsTrigger>
      </TabsList>
      <div className="mt-6">
        {tab === "integrations" ? <IntegrationsEditor keys={keys} /> : <StatusTable rows={status} />}
      </div>
    </Tabs>
  );
}
