import { redirect } from "next/navigation";

export default function RunsPage() {
  // As per Section 2.3 & FE-2.1 of plan.md, redirect to history or new recovery run
  redirect("/history");
}

