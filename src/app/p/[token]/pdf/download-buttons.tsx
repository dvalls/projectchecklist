"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  getPublicFullReport,
  getPublicSubmissionSummary,
  type PublicFullReport,
  type PublicSubmissionSummary,
} from "../actions";

const BUCKET = "checklist-images";

function getPublicBaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function renderPdfBlob(data: PublicFullReport): Promise<Blob> {
  const [{ pdf }, { ReportDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./report-document"),
  ]);
  return pdf(<ReportDocument data={data} />).toBlob();
}

function summaryToFullReport(
  summary: PublicSubmissionSummary,
  projectName = "Checklist",
): PublicFullReport {
  return {
    project: {
      id: "",
      name: projectName,
      description: null,
      image_url: null,
    },
    office: null,
    designers: [],
    disciplines: [],
    publicBaseUrl: getPublicBaseUrl(),
    generatedAt: new Date().toISOString(),
    templates: [
      {
        template: summary.template,
        sections: summary.sections,
        fields: summary.fields,
        submissions: [
          {
            submission: summary.submission,
            values: summary.values,
            matrixValues: summary.matrixValues,
          },
        ],
      },
    ],
  };
}

interface SubmissionButtonProps {
  token: string;
  submissionId: string;
  clientName: string | null;
  templateName: string;
  projectName?: string;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default";
}

export function DownloadSubmissionPdfButton({
  token,
  submissionId,
  clientName,
  templateName,
  projectName,
  variant = "outline",
  size = "sm",
}: SubmissionButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await getPublicSubmissionSummary(token, submissionId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if (!("data" in res) || !res.data) {
        toast.error("Não foi possível carregar o resumo.");
        return;
      }

      const payload = summaryToFullReport(res.data, projectName);
      const blob = await renderPdfBlob(payload);
      const parts = [
        "resumo",
        slugify(templateName),
        slugify(clientName ?? "sem-nome"),
      ].filter(Boolean);
      await downloadBlob(blob, `${parts.join("-")}.pdf`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao gerar PDF.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-3.5 w-3.5" />
      )}
      Baixar PDF
    </Button>
  );
}

interface FullReportButtonProps {
  token: string;
  projectName: string;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default";
}

export function DownloadFullReportButton({
  token,
  projectName,
  variant = "outline",
  size = "sm",
}: FullReportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await getPublicFullReport(token);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if (!("data" in res) || !res.data) {
        toast.error("Não foi possível gerar o relatório.");
        return;
      }

      if (res.data.templates.length === 0) {
        toast.info("Nenhum preenchimento registrado ainda.");
        return;
      }

      const blob = await renderPdfBlob(res.data);
      const filename = `relatorio-${slugify(projectName) || "checklist"}.pdf`;
      await downloadBlob(blob, filename);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao gerar PDF.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-3.5 w-3.5" />
      )}
      Baixar relatório completo
    </Button>
  );
}
