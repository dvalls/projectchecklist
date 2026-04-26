import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, getInitials, getInitialsFromEmail } from "./format";

describe("formatDateTime", () => {
  it("returns empty for null/undefined/empty", () => {
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime(undefined)).toBe("");
    expect(formatDateTime("")).toBe("");
  });

  it("formats valid ISO date in pt-BR", () => {
    const result = formatDateTime("2024-01-15T10:30:00Z");
    expect(result).toMatch(/15\/01\/2024/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it("returns the original string for invalid input", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDate", () => {
  it("formats only the date in pt-BR", () => {
    const result = formatDate("2024-12-25T00:00:00Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/2024/);
    expect(result).not.toMatch(/:/);
  });
});

describe("getInitials", () => {
  it("returns ? when source and fallback are empty", () => {
    expect(getInitials(null)).toBe("?");
    expect(getInitials("", "")).toBe("?");
  });

  it("returns first two letters for single word", () => {
    expect(getInitials("Diego")).toBe("DI");
  });

  it("returns first letters of first and last word", () => {
    expect(getInitials("Diego Silva Valls")).toBe("DV");
  });

  it("falls back to second arg", () => {
    expect(getInitials(null, "user@example.com")).toBe("US");
  });
});

describe("getInitialsFromEmail", () => {
  it("returns ? for empty email", () => {
    expect(getInitialsFromEmail(null)).toBe("?");
    expect(getInitialsFromEmail("")).toBe("?");
  });

  it("uses local part split by separators", () => {
    expect(getInitialsFromEmail("john.doe@example.com")).toBe("JD");
    expect(getInitialsFromEmail("jane_smith@example.com")).toBe("JS");
    expect(getInitialsFromEmail("first-last@example.com")).toBe("FL");
  });

  it("returns first two letters when no separator", () => {
    expect(getInitialsFromEmail("admin@example.com")).toBe("AD");
  });
});
