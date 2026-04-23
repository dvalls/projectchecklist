export type FieldType =
  | "text"
  | "textarea"
  | "checkbox"
  | "select"
  | "radio"
  | "date"
  | "number"
  | "image";

export type ColumnSpan = 1 | 2 | 3;

export type SubmissionStatus = "draft" | "submitted";

export type FieldOptions =
  | { choices: { label: string; value: string }[] }
  | null;

export interface ClProject {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClDiscipline {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface ClFormTemplate {
  id: string;
  project_id: string;
  discipline_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClFormField {
  id: string;
  template_id: string;
  label: string;
  help_text: string | null;
  type: FieldType;
  required: boolean;
  column_span: ColumnSpan;
  position: number;
  options: FieldOptions;
  created_at: string;
}

export interface ClChecklistSequence {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClChecklistStep {
  id: string;
  sequence_id: string;
  template_id: string;
  position: number;
  required: boolean;
  created_at: string;
}

export interface ClFormSubmission {
  id: string;
  project_id: string;
  template_id: string;
  sequence_id: string | null;
  step_id: string | null;
  submitted_by: string;
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClSubmissionValue {
  id: string;
  submission_id: string;
  field_id: string;
  value: string | null;
  image_url: string | null;
  created_at: string;
}

type WithDefaults<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required>>;

type Relationships = [];

export type Database = {
  public: {
    Tables: {
      cl_projects: {
        Row: ClProject;
        Insert: WithDefaults<ClProject, "name" | "created_by">;
        Update: Partial<ClProject>;
        Relationships: Relationships;
      };
      cl_disciplines: {
        Row: ClDiscipline;
        Insert: WithDefaults<ClDiscipline, "project_id" | "name">;
        Update: Partial<ClDiscipline>;
        Relationships: Relationships;
      };
      cl_form_templates: {
        Row: ClFormTemplate;
        Insert: WithDefaults<ClFormTemplate, "project_id" | "name">;
        Update: Partial<ClFormTemplate>;
        Relationships: Relationships;
      };
      cl_form_fields: {
        Row: ClFormField;
        Insert: WithDefaults<ClFormField, "template_id" | "label" | "type">;
        Update: Partial<ClFormField>;
        Relationships: Relationships;
      };
      cl_checklist_sequences: {
        Row: ClChecklistSequence;
        Insert: WithDefaults<ClChecklistSequence, "project_id" | "name">;
        Update: Partial<ClChecklistSequence>;
        Relationships: Relationships;
      };
      cl_checklist_steps: {
        Row: ClChecklistStep;
        Insert: WithDefaults<
          ClChecklistStep,
          "sequence_id" | "template_id"
        >;
        Update: Partial<ClChecklistStep>;
        Relationships: Relationships;
      };
      cl_form_submissions: {
        Row: ClFormSubmission;
        Insert: WithDefaults<
          ClFormSubmission,
          "project_id" | "template_id" | "submitted_by"
        >;
        Update: Partial<ClFormSubmission>;
        Relationships: Relationships;
      };
      cl_submission_values: {
        Row: ClSubmissionValue;
        Insert: WithDefaults<
          ClSubmissionValue,
          "submission_id" | "field_id"
        >;
        Update: Partial<ClSubmissionValue>;
        Relationships: Relationships;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
