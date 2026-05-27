"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { LeadDetailDrawer, type LeadDetail } from "./LeadDetailDrawer";

export function LeadRowTrigger({ lead }: { lead: LeadDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Виж детайли"
        className="w-7 h-7 grid place-items-center rounded-md hover:bg-blue-soft text-ink-3 hover:text-blue transition"
      >
        <Eye size={13} />
      </button>
      {open && <LeadDetailDrawer lead={lead} onClose={() => setOpen(false)} />}
    </>
  );
}
