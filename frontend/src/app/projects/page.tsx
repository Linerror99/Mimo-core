import React, { Suspense } from "react";
import { ProjectsPageClient } from "@/components/features/projects/projects-page-client";

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageClient />
    </Suspense>
  );
}
