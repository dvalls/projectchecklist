import type { ClFormField } from "@/lib/supabase/types";

export interface CheckboxGroupValue {
  selected: string[];
  other?: string;
}

export interface FieldValue {
  value: string | null;
}

export type FieldType = ClFormField["type"];

export interface SubmissionValueInput {
  field_id: string;
  value: string | null;
  image_url: string | null;
}

export interface SubmissionMatrixValueInput {
  field_id: string;
  env_key: string;
  value: string | null;
  image_url: string | null;
}
