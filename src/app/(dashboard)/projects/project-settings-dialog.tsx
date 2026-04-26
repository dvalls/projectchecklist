"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ProjectBehaviorSettings } from "./[id]/project-behavior-settings";
import { ProjectCoverSettings } from "./[id]/project-cover-settings";
import { ProjectDesignersPanel } from "./[id]/project-designers-panel";
import { getProjectSettingsData, type ProjectSettingsData } from "./actions";

interface Props {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettingsDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: Props) {
  const [data, setData] = useState<ProjectSettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || data !== null || loading) return;
    setLoading(true);
    getProjectSettingsData(projectId).then((result) => {
      setLoading(false);
      if ("error" in result) {
        setError(result.error);
      } else {
        setData(result.data);
      }
    });
  }, [open, data, loading, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações — {projectName}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && (
          <div className="space-y-6 pb-2">
            <ProjectCoverSettings
              projectId={projectId}
              initialImageUrl={data.imageUrl}
              publicBaseUrl={data.publicBaseUrl}
            />
            <ProjectBehaviorSettings
              projectId={projectId}
              initialAllow={data.allowResubmit}
            />
            <ProjectDesignersPanel
              projectId={projectId}
              allDesigners={data.allDesigners}
              selectedIds={data.selectedDesignerIds}
              publicBaseUrl={data.publicBaseUrl}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
