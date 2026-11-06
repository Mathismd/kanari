"use client";

import { PageHeader } from "@/components/ui";
import { WasteForm } from "@/components/waste-form";

export default function SaisiePage() {
  return (
    <>
      <PageHeader
        title="Saisir une pesée"
        description="Deux pesées par service suffisent : les restes des assiettes et ce qui a été préparé sans être servi."
      />
      <WasteForm />
    </>
  );
}
