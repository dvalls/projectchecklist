import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "./auth";
import { identityIdentificationSchema } from "./public-link";
import { projectCreateSchema, projectRenameSchema } from "./projects";
import { disciplineInputSchema } from "./disciplines";
import { designerInputSchema } from "./designers";
import { officeSettingsFormSchema } from "./office";

describe("auth schemas", () => {
  it("signInSchema rejects invalid email", () => {
    const r = signInSchema.safeParse({ email: "x", password: "abc" });
    expect(r.success).toBe(false);
  });

  it("signInSchema accepts valid", () => {
    const r = signInSchema.safeParse({
      email: " a@b.com ",
      password: "secret",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("a@b.com");
  });

  it("signUpSchema enforces 6+ chars password", () => {
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "12345" }).success).toBe(
      false,
    );
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "123456" }).success).toBe(
      true,
    );
  });
});

describe("identityIdentificationSchema", () => {
  it("requires name", () => {
    const r = identityIdentificationSchema.safeParse({
      client_name: "  ",
      client_email: "a@b.com",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = identityIdentificationSchema.safeParse({
      client_name: "John",
      client_email: "not-an-email",
    });
    expect(r.success).toBe(false);
  });

  it("normalizes email to lowercase and trims", () => {
    const r = identityIdentificationSchema.safeParse({
      client_name: "  John  ",
      client_email: "  John@Example.COM  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.client_name).toBe("John");
      expect(r.data.client_email).toBe("john@example.com");
    }
  });
});

describe("project schemas", () => {
  it("projectCreateSchema requires name", () => {
    expect(projectCreateSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(projectCreateSchema.safeParse({ name: "Casa" }).success).toBe(true);
  });

  it("projectRenameSchema requires uuid", () => {
    const r = projectRenameSchema.safeParse({ id: "not-uuid", name: "X" });
    expect(r.success).toBe(false);
  });
});

describe("discipline schema", () => {
  it("requires name and color (default applies)", () => {
    const r = disciplineInputSchema.safeParse({ name: "Arq" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.color).toBe("#3b82f6");
  });
});

describe("designer schema", () => {
  it("requires name", () => {
    expect(designerInputSchema.safeParse({ name: "" }).success).toBe(false);
    expect(designerInputSchema.safeParse({ name: "Ana" }).success).toBe(true);
  });
});

describe("office settings form schema", () => {
  it("rejects invalid url", () => {
    const r = officeSettingsFormSchema.safeParse({
      website: "not-url",
    });
    expect(r.success).toBe(false);
  });

  it("accepts empty website", () => {
    const r = officeSettingsFormSchema.safeParse({
      website: "",
    });
    expect(r.success).toBe(true);
  });

  it("accepts valid url", () => {
    const r = officeSettingsFormSchema.safeParse({
      website: "https://example.com",
    });
    expect(r.success).toBe(true);
  });
});
