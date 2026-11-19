import { redirect } from "next/navigation";

export default function GoalsRedirectPage() {
  redirect("/projects?tab=goals");
}
