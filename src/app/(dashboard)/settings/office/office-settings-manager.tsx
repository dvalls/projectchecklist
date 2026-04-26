"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  Facebook,
  Globe,
  ImageIcon,
  Instagram,
  Linkedin,
  Loader2,
  MessageCircle,
  Save,
  Twitter,
  Upload,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { BUCKETS } from "@/lib/constants";
import {
  officeSettingsFormSchema,
  type OfficeSettingsFormValues as FormValues,
} from "@/lib/schemas/office";
import { createClient } from "@/lib/supabase/client";
import type { ClOfficeSettings } from "@/lib/supabase/types";

import { upsertOfficeSettings } from "./actions";

const BUCKET = BUCKETS.CHECKLIST_IMAGES;

interface Props {
  initialSettings: ClOfficeSettings | null;
  publicBaseUrl: string;
}

export function OfficeSettingsManager({ initialSettings, publicBaseUrl }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initialSettings?.logo_url ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(officeSettingsFormSchema),
    defaultValues: {
      office_name: initialSettings?.office_name ?? "",
      website: initialSettings?.website ?? "",
      instagram: initialSettings?.instagram ?? "",
      facebook: initialSettings?.facebook ?? "",
      linkedin: initialSettings?.linkedin ?? "",
      twitter: initialSettings?.twitter ?? "",
      whatsapp: initialSettings?.whatsapp ?? "",
    },
  });

  const logoPreview = logoUrl ? `${publicBaseUrl}/${logoUrl}` : null;

  async function handleLogoUpload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada.");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/office/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

    if (error) {
      toast.error(`Erro no upload: ${error.message}`);
      setUploading(false);
      return;
    }

    startTransition(async () => {
      const res = await upsertOfficeSettings({
        office_name: initialSettings?.office_name ?? null,
        logo_url: path,
        website: initialSettings?.website ?? null,
        instagram: initialSettings?.instagram ?? null,
        facebook: initialSettings?.facebook ?? null,
        linkedin: initialSettings?.linkedin ?? null,
        twitter: initialSettings?.twitter ?? null,
        whatsapp: initialSettings?.whatsapp ?? null,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        setLogoUrl(path);
        toast.success("Logo atualizado.");
      }
      setUploading(false);
    });
  }

  async function handleLogoRemove() {
    startTransition(async () => {
      const res = await upsertOfficeSettings({
        office_name: initialSettings?.office_name ?? null,
        logo_url: null,
        website: initialSettings?.website ?? null,
        instagram: initialSettings?.instagram ?? null,
        facebook: initialSettings?.facebook ?? null,
        linkedin: initialSettings?.linkedin ?? null,
        twitter: initialSettings?.twitter ?? null,
        whatsapp: initialSettings?.whatsapp ?? null,
      });
      if (res.error) toast.error(res.error);
      else {
        setLogoUrl(null);
        toast.success("Logo removido.");
      }
    });
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const res = await upsertOfficeSettings({
        office_name: values.office_name ?? null,
        logo_url: logoUrl,
        website: values.website ?? null,
        instagram: values.instagram ?? null,
        facebook: values.facebook ?? null,
        linkedin: values.linkedin ?? null,
        twitter: values.twitter ?? null,
        whatsapp: values.whatsapp ?? null,
      });
      if (res.error) toast.error(res.error);
      else toast.success("Configurações salvas.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logo do escritório</CardTitle>
          <CardDescription>
            Utilizado em documentos, capas e links públicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Logo"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <Building2 className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent">
              {uploading || isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : "Enviar logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {logoUrl ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogoRemove}
                disabled={isPending || uploading}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Remover logo
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              PNG, JPG ou SVG. Recomendado: fundo transparente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dados gerais e redes sociais */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Nome e presença digital do escritório.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="office_name">Nome do escritório</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="office_name"
                  placeholder="Ex.: Arq. João e Associados"
                  className="pl-9"
                  {...register("office_name")}
                />
              </div>
              {errors.office_name && (
                <p className="text-xs text-destructive">{errors.office_name.message}</p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label htmlFor="website">Site</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="website"
                  placeholder="https://www.escritorio.com.br"
                  className="pl-9"
                  {...register("website")}
                />
              </div>
              {errors.website && (
                <p className="text-xs text-destructive">{errors.website.message}</p>
              )}
            </div>

            <Separator />

            <p className="text-sm font-medium">Redes sociais</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Instagram */}
              <div className="space-y-1.5">
                <Label htmlFor="instagram">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="instagram"
                    placeholder="@usuario"
                    className="pl-9"
                    {...register("instagram")}
                  />
                </div>
              </div>

              {/* Facebook */}
              <div className="space-y-1.5">
                <Label htmlFor="facebook">Facebook</Label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="facebook"
                    placeholder="facebook.com/pagina"
                    className="pl-9"
                    {...register("facebook")}
                  />
                </div>
              </div>

              {/* LinkedIn */}
              <div className="space-y-1.5">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    placeholder="linkedin.com/company/escritorio"
                    className="pl-9"
                    {...register("linkedin")}
                  />
                </div>
              </div>

              {/* Twitter / X */}
              <div className="space-y-1.5">
                <Label htmlFor="twitter">Twitter / X</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="twitter"
                    placeholder="@usuario"
                    className="pl-9"
                    {...register("twitter")}
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    placeholder="5511999990000"
                    className="pl-9"
                    {...register("whatsapp")}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Número com DDI e DDD, sem espaços ou símbolos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isPending || (!isDirty && !!initialSettings)}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar configurações
          </Button>
        </div>
      </form>
    </div>
  );
}
