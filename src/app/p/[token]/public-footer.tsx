import { type ElementType } from "react";
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  MessageCircle,
  Twitter,
} from "lucide-react";

import type { ClOfficeSettings } from "@/lib/supabase/types";

export type PublicOfficeSettings = Pick<
  ClOfficeSettings,
  | "office_name"
  | "logo_url"
  | "website"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "twitter"
  | "whatsapp"
>;

interface SocialLink {
  href: string;
  label: string;
  icon: ElementType;
}

function buildSocialUrl(
  type: "instagram" | "facebook" | "linkedin" | "twitter" | "whatsapp" | "website",
  value: string,
): string {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  switch (type) {
    case "instagram":
      return `https://instagram.com/${v.replace(/^@/, "")}`;
    case "facebook":
      return `https://${v.startsWith("facebook.com") ? v : `facebook.com/${v}`}`;
    case "linkedin":
      return `https://${v.startsWith("linkedin.com") ? v : `linkedin.com/in/${v}`}`;
    case "twitter":
      return `https://twitter.com/${v.replace(/^@/, "")}`;
    case "whatsapp":
      return `https://wa.me/${v.replace(/\D/g, "")}`;
    case "website":
      return v;
  }
}

function buildSocialLinks(
  officeSettings: Partial<PublicOfficeSettings> | null,
): SocialLink[] {
  if (!officeSettings) return [];
  const entries: Array<{
    type: "instagram" | "facebook" | "linkedin" | "twitter" | "whatsapp" | "website";
    value: string | null | undefined;
    label: string;
    icon: ElementType;
  }> = [
    {
      type: "instagram",
      value: officeSettings.instagram,
      label: "Instagram",
      icon: Instagram,
    },
    {
      type: "facebook",
      value: officeSettings.facebook,
      label: "Facebook",
      icon: Facebook,
    },
    {
      type: "linkedin",
      value: officeSettings.linkedin,
      label: "LinkedIn",
      icon: Linkedin,
    },
    {
      type: "twitter",
      value: officeSettings.twitter,
      label: "Twitter / X",
      icon: Twitter,
    },
    {
      type: "whatsapp",
      value: officeSettings.whatsapp,
      label: "WhatsApp",
      icon: MessageCircle,
    },
    { type: "website", value: officeSettings.website, label: "Site", icon: Globe },
  ];
  return entries
    .filter((e) => e.value?.trim())
    .map((e) => ({
      href: buildSocialUrl(e.type, e.value!),
      label: e.label,
      icon: e.icon,
    }))
    .filter((e) => e.href);
}

interface PublicFooterProps {
  officeSettings: Partial<PublicOfficeSettings> | null;
}

export function PublicFooter({ officeSettings }: PublicFooterProps) {
  const officeName = officeSettings?.office_name ?? null;
  const socials = buildSocialLinks(officeSettings);

  if (!officeName && socials.length === 0) return null;

  return (
    <footer className="shrink-0 border-t bg-background">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-col items-center justify-center gap-3 px-4 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          {officeName && (
            <p className="text-sm font-medium text-muted-foreground">{officeName}</p>
          )}
        </div>
        {socials.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {socials.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
