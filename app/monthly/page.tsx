import { redirect } from "next/navigation";
import { currentMonthKey } from "../../lib/receipt-store";

export default function MonthlyPage() {
  redirect(`/reports?month=${currentMonthKey()}`);
}
