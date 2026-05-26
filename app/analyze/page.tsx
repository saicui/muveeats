import { redirect } from "next/navigation";

export default function AnalyzeRedirect() {
  redirect("/meals/new?mode=photo");
}
