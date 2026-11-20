"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { ProjectsPageClient } from "@/components/features/projects/projects-page-client";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <Suspense fallback={null}>
      <ProjectsPageClient initialProjectId={params?.id} />
    </Suspense>
  );
}
