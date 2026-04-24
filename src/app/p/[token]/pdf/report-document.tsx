"use client";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type {
  ClFormField,
  ClFormSection,
  ClFormSubmission,
  ClSubmissionValue,
  ClSubmissionValueMatrix,
} from "@/lib/supabase/types";

import type {
  PublicFullReport,
  ReportTemplateEntry,
} from "../actions";
import { formatDateTime, formatFieldValue } from "./format-value";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.4,
  },
  coverPage: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  coverHeader: {
    borderBottom: "2pt solid #0f172a",
    paddingBottom: 14,
    marginBottom: 20,
  },
  coverKicker: {
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#64748b",
  },
  coverTitle: {
    fontSize: 26,
    marginTop: 6,
    fontFamily: "Helvetica-Bold",
  },
  coverDescription: {
    marginTop: 10,
    fontSize: 11,
    color: "#334155",
  },
  coverLogo: {
    maxHeight: 44,
    maxWidth: 180,
    marginBottom: 16,
    objectFit: "contain",
  },
  coverImage: {
    width: "100%",
    height: 220,
    marginTop: 18,
    marginBottom: 18,
    objectFit: "cover",
  },
  sectionHeading: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  designersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  designerCard: {
    width: "33.33%",
    padding: 4,
  },
  designerInner: {
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  designerPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    objectFit: "cover",
  },
  designerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  designerRole: {
    fontSize: 8,
    color: "#64748b",
  },
  disciplinesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  disciplineChip: {
    border: "1pt solid #e2e8f0",
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 9,
    marginRight: 6,
    marginBottom: 6,
  },
  templateBlock: {
    marginBottom: 18,
  },
  templateHeader: {
    borderBottom: "1pt solid #cbd5e1",
    paddingBottom: 6,
    marginBottom: 10,
  },
  templateTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  templateMeta: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  submissionBlock: {
    marginBottom: 14,
    borderLeft: "2pt solid #0f172a",
    paddingLeft: 10,
  },
  submissionHeader: {
    backgroundColor: "#f1f5f9",
    padding: 6,
    marginBottom: 8,
  },
  submissionName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  submissionMeta: {
    color: "#475569",
    fontSize: 9,
    marginTop: 1,
  },
  formSectionTitle: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
    marginBottom: 5,
  },
  fieldRow: {
    flexDirection: "row",
    border: "1pt solid #e2e8f0",
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  fieldLabel: {
    width: 140,
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
    paddingRight: 8,
  },
  fieldValue: {
    flex: 1,
    fontSize: 10,
  },
  matrixBlock: {
    border: "1pt solid #e2e8f0",
    borderRadius: 3,
    padding: 8,
    marginBottom: 6,
  },
  matrixFieldLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 4,
  },
  matrixRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  matrixEnv: {
    width: 90,
    textTransform: "uppercase",
    fontSize: 8,
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
  },
  matrixValue: {
    flex: 1,
    fontSize: 9,
  },
  answerImage: {
    marginTop: 6,
    maxHeight: 140,
    maxWidth: 260,
    objectFit: "contain",
  },
  imageTag: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
  muted: {
    color: "#64748b",
  },
  emptyState: {
    color: "#64748b",
    fontStyle: "italic",
    fontSize: 10,
  },
});

function buildImageUrl(baseUrl: string, path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}/${path}`;
}

function SectionedFields({
  entry,
  submissionValues,
  submissionMatrix,
  publicBaseUrl,
}: {
  entry: ReportTemplateEntry;
  submissionValues: ClSubmissionValue[];
  submissionMatrix: ClSubmissionValueMatrix[];
  publicBaseUrl: string;
}) {
  const { template, sections, fields } = entry;
  const isMatrix = template.layout_mode === "matrix";
  const environments = (template.environments ?? []) as string[];

  const valuesByField = new Map(submissionValues.map((v) => [v.field_id, v] as const));
  const matrixByKey = new Map(
    submissionMatrix.map((v) => [`${v.field_id}::${v.env_key}`, v] as const),
  );

  const sectionsToRender: ClFormSection[] =
    sections.length > 0
      ? sections
      : [
          {
            id: "_default",
            template_id: template.id,
            title: "",
            subtitle: null,
            columns: 3,
            position: 0,
            created_at: "",
          },
        ];

  const renderedSections = sectionsToRender
    .map((section) => {
      const secFields =
        sections.length > 0
          ? fields.filter((f) => f.section_id === section.id)
          : fields;
      const visible = secFields.filter((f) => f.type !== "info");
      if (visible.length === 0) return null;
      return { section, visible };
    })
    .filter((x): x is { section: ClFormSection; visible: ClFormField[] } =>
      Boolean(x),
    );

  if (renderedSections.length === 0) {
    return <Text style={styles.emptyState}>Sem respostas registradas.</Text>;
  }

  return (
    <View>
      {renderedSections.map(({ section, visible }) => (
        <View key={section.id} wrap={false} style={{ marginBottom: 6 }}>
          {section.title ? (
            <Text style={styles.formSectionTitle}>{section.title}</Text>
          ) : null}
          {visible.map((field) => {
            if (isMatrix) {
              return (
                <View key={field.id} style={styles.matrixBlock} wrap={false}>
                  <Text style={styles.matrixFieldLabel}>{field.label}</Text>
                  {environments.map((env) => {
                    const v = matrixByKey.get(`${field.id}::${env}`);
                    const imgUrl = buildImageUrl(
                      publicBaseUrl,
                      v?.image_url ?? null,
                    );
                    return (
                      <View key={env} style={{ marginBottom: 2 }}>
                        <View style={styles.matrixRow}>
                          <Text style={styles.matrixEnv}>{env}</Text>
                          <Text style={styles.matrixValue}>
                            {formatFieldValue(field, v?.value ?? null)}
                          </Text>
                        </View>
                        {imgUrl ? (
                          // eslint-disable-next-line jsx-a11y/alt-text
                          <Image src={imgUrl} style={styles.answerImage} />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            }

            const v = valuesByField.get(field.id);
            const imgUrl = buildImageUrl(publicBaseUrl, v?.image_url ?? null);
            return (
              <View key={field.id} wrap={false} style={{ marginBottom: 4 }}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldValue}>
                      {formatFieldValue(field, v?.value ?? null)}
                    </Text>
                    {imgUrl ? (
                      <>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={imgUrl} style={styles.answerImage} />
                      </>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Cover({ data }: { data: PublicFullReport }) {
  const { project, office, designers, disciplines, publicBaseUrl } = data;
  const logoUrl = buildImageUrl(publicBaseUrl, office?.logo_url ?? null);
  const coverUrl = buildImageUrl(publicBaseUrl, project.image_url);

  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverHeader}>
        {logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={logoUrl} style={styles.coverLogo} />
        ) : office?.office_name ? (
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>
            {office.office_name}
          </Text>
        ) : null}
        <Text style={styles.coverKicker}>Checklist do projeto</Text>
        <Text style={styles.coverTitle}>{project.name}</Text>
        {project.description ? (
          <Text style={styles.coverDescription}>{project.description}</Text>
        ) : null}
      </View>

      {coverUrl ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={coverUrl} style={styles.coverImage} />
      ) : null}

      {designers.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionHeading}>Projetistas</Text>
          <View style={styles.designersGrid}>
            {designers.map((d) => {
              const photo = buildImageUrl(publicBaseUrl, d.photo_url);
              return (
                <View key={d.id} style={styles.designerCard}>
                  <View style={styles.designerInner}>
                    {photo ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <Image src={photo} style={styles.designerPhoto} />
                    ) : (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          marginRight: 8,
                          backgroundColor: "#e2e8f0",
                        }}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.designerName}>{d.name}</Text>
                      {d.role ? (
                        <Text style={styles.designerRole}>{d.role}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {disciplines.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionHeading}>Disciplinas</Text>
          <View style={styles.disciplinesRow}>
            {disciplines.map((d) => (
              <Text key={d.id} style={styles.disciplineChip}>
                {d.name}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      <Text
        style={styles.footer}
        render={({ pageNumber, totalPages }) =>
          `Gerado em ${formatDateTime(data.generatedAt)}  ·  página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </Page>
  );
}

function SubmissionBlock({
  entry,
  submission,
  values,
  matrixValues,
  publicBaseUrl,
}: {
  entry: ReportTemplateEntry;
  submission: Pick<
    ClFormSubmission,
    | "id"
    | "client_name"
    | "client_email"
    | "submitted_at"
    | "created_at"
    | "status"
  >;
  values: ClSubmissionValue[];
  matrixValues: ClSubmissionValueMatrix[];
  publicBaseUrl: string;
}) {
  return (
    <View style={styles.submissionBlock} wrap>
      <View style={styles.submissionHeader} wrap={false}>
        <Text style={styles.submissionName}>
          {submission.client_name ?? "Anônimo"}
        </Text>
        <Text style={styles.submissionMeta}>
          {submission.client_email ?? "—"}
        </Text>
        <Text style={styles.submissionMeta}>
          Enviado em {formatDateTime(submission.submitted_at ?? submission.created_at)}
        </Text>
      </View>
      <SectionedFields
        entry={entry}
        submissionValues={values}
        submissionMatrix={matrixValues}
        publicBaseUrl={publicBaseUrl}
      />
    </View>
  );
}

export function ReportDocument({ data }: { data: PublicFullReport }) {
  const hasContent = data.templates.length > 0;

  return (
    <Document
      title={`Checklist — ${data.project.name}`}
      author={data.office?.office_name ?? undefined}
    >
      <Cover data={data} />

      {hasContent ? (
        data.templates.map((entry) => (
          <Page key={entry.template.id} size="A4" style={styles.page}>
            <View style={styles.templateBlock}>
              <View style={styles.templateHeader}>
                <Text style={styles.templateTitle}>{entry.template.name}</Text>
                {entry.template.description ? (
                  <Text style={styles.templateMeta}>
                    {entry.template.description}
                  </Text>
                ) : null}
                <Text style={styles.templateMeta}>
                  {entry.submissions.length}{" "}
                  {entry.submissions.length === 1
                    ? "preenchimento"
                    : "preenchimentos"}
                </Text>
              </View>

              {entry.submissions.map((s) => (
                <SubmissionBlock
                  key={s.submission.id}
                  entry={entry}
                  submission={s.submission}
                  values={s.values}
                  matrixValues={s.matrixValues}
                  publicBaseUrl={data.publicBaseUrl}
                />
              ))}
            </View>

            <Text
              style={styles.footer}
              render={({ pageNumber, totalPages }) =>
                `${data.project.name}  ·  página ${pageNumber} de ${totalPages}`
              }
              fixed
            />
          </Page>
        ))
      ) : (
        <Page size="A4" style={styles.page}>
          <Text style={styles.emptyState}>
            Nenhum preenchimento registrado neste link.
          </Text>
        </Page>
      )}
    </Document>
  );
}
