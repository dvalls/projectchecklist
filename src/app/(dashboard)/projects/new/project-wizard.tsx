"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { ClDesigner, ClDiscipline } from "@/lib/supabase/types";

import { createProjectDraft, updateProjectBasics } from "./actions";
import type { AddedTemplate } from "./steps/step-forms";
import { StepBasics } from "./steps/step-basics";
import { StepBehavior } from "./steps/step-behavior";
import { StepCover } from "./steps/step-cover";
import { StepDesigners } from "./steps/step-designers";
import { StepForms } from "./steps/step-forms";
import { StepReview } from "./steps/step-review";
import { WizardStepper, type WizardStep } from "./wizard-stepper";

import type { ImportableTemplate } from "../[id]/templates/import-existing-dialog";

const STEPS: WizardStep[] = [
  { id: "basics", label: "Informações básicas", shortLabel: "Básico" },
  { id: "cover", label: "Capa" },
  { id: "designers", label: "Projetistas" },
  { id: "forms", label: "Formulários" },
  { id: "behavior", label: "Comportamento", shortLabel: "Comportamento" },
  { id: "review", label: "Revisão" },
];

interface Props {
  disciplines: ClDiscipline[];
  designers: ClDesigner[];
  importableTemplates: ImportableTemplate[];
  publicBaseUrl: string;
}

export function ProjectWizard({
  disciplines,
  designers,
  importableTemplates,
  publicBaseUrl,
}: Props) {
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [savedBasics, setSavedBasics] = useState<{
    name: string;
    description: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [designerIds, setDesignerIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<AddedTemplate[]>([]);
  const [allowResubmit, setAllowResubmit] = useState(false);

  const [isSavingBasics, startBasicsTransition] = useTransition();
  const [finishing, setFinishing] = useState(false);

  const designerById = useMemo(
    () => new Map(designers.map((d) => [d.id, d])),
    [designers],
  );
  const selectedDesigners = useMemo(
    () => designerIds.map((id) => designerById.get(id)).filter(Boolean) as ClDesigner[],
    [designerIds, designerById],
  );

  function goToStep(index: number) {
    if (index < 0 || index >= STEPS.length) return;
    if (index > furthest) return;
    setStepIndex(index);
  }

  function persistBasicsThen(callback: () => void) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Informe o nome do projeto.");
      return;
    }
    if (!projectId) {
      startBasicsTransition(async () => {
        const result = await createProjectDraft({ name, description });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setProjectId(result.projectId);
        setSavedBasics({
          name: trimmedName,
          description: description.trim(),
        });
        callback();
      });
      return;
    }
    const trimmedDescription = description.trim();
    const changed =
      !savedBasics ||
      savedBasics.name !== trimmedName ||
      savedBasics.description !== trimmedDescription;
    if (!changed) {
      callback();
      return;
    }
    startBasicsTransition(async () => {
      const result = await updateProjectBasics(projectId, {
        name,
        description,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setSavedBasics({ name: trimmedName, description: trimmedDescription });
      callback();
    });
  }

  function handleNext() {
    const nextIndex = stepIndex + 1;
    const advance = () => {
      setStepIndex(nextIndex);
      setFurthest((f) => Math.max(f, nextIndex));
    };
    if (stepIndex === 0) {
      persistBasicsThen(advance);
      return;
    }
    advance();
  }

  function handleBack() {
    if (stepIndex === 0) return;
    setStepIndex(stepIndex - 1);
  }

  function handleFinish() {
    if (!projectId) {
      toast.error("Projeto não foi criado.");
      return;
    }
    setFinishing(true);
    router.push(`/projects/${projectId}`);
  }

  function handleExit() {
    router.push("/projects");
  }

  const currentStep = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const canGoNext = stepIndex !== 0 || (name.trim().length > 0 && !isSavingBasics);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <WizardStepper
            steps={STEPS}
            currentIndex={stepIndex}
            furthestIndex={furthest}
            onStepClick={goToStep}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExit}
            className="self-end sm:self-auto"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Sair
          </Button>
        </div>

        <div className="px-4 py-6 sm:px-6">
          {currentStep.id === "basics" ? (
            <StepBasics
              name={name}
              description={description}
              onChangeName={setName}
              onChangeDescription={setDescription}
            />
          ) : null}

          {currentStep.id === "cover" && projectId ? (
            <StepCover
              projectId={projectId}
              imageUrl={imageUrl}
              publicBaseUrl={publicBaseUrl}
              onChangeImageUrl={setImageUrl}
            />
          ) : null}

          {currentStep.id === "designers" && projectId ? (
            <StepDesigners
              projectId={projectId}
              allDesigners={designers}
              selectedIds={designerIds}
              publicBaseUrl={publicBaseUrl}
              onChangeSelected={setDesignerIds}
            />
          ) : null}

          {currentStep.id === "forms" && projectId ? (
            <StepForms
              projectId={projectId}
              importable={importableTemplates}
              disciplines={disciplines}
              added={templates}
              onChangeAdded={setTemplates}
            />
          ) : null}

          {currentStep.id === "behavior" && projectId ? (
            <StepBehavior
              projectId={projectId}
              allow={allowResubmit}
              onChangeAllow={setAllowResubmit}
            />
          ) : null}

          {currentStep.id === "review" ? (
            <StepReview
              name={name}
              description={description}
              imageUrl={imageUrl}
              publicBaseUrl={publicBaseUrl}
              selectedDesigners={selectedDesigners}
              templates={templates}
              allowResubmit={allowResubmit}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3 sm:px-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0 || isSavingBasics || finishing}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar
          </Button>

          <div className="text-xs text-muted-foreground">
            Passo {stepIndex + 1} de {STEPS.length}
          </div>

          {isLast ? (
            <Button onClick={handleFinish} disabled={finishing || !projectId}>
              {finishing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Concluir
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canGoNext}>
              {isSavingBasics ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Continuar
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
