"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/locale-context";

export function PrintButton() {
  const dict = useDict();
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" />
      {dict.opportunities.print}
    </Button>
  );
}
