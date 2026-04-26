import { describe, expect, it } from "vitest";

import type { ClFormField, VisibleWhen } from "@/lib/supabase/types";

import {
  evaluateVisible,
  isDisplayOnly,
  isFieldAnswered,
  makeFieldKey,
  parseCheckboxGroup,
  serializeCheckboxGroup,
} from "./utils";

describe("isDisplayOnly", () => {
  it("returns true for info and image", () => {
    expect(isDisplayOnly("info")).toBe(true);
    expect(isDisplayOnly("image")).toBe(true);
  });
  it("returns false for input types", () => {
    expect(isDisplayOnly("text")).toBe(false);
    expect(isDisplayOnly("checkbox_group")).toBe(false);
  });
});

describe("makeFieldKey", () => {
  it("returns just the id when no env", () => {
    expect(makeFieldKey("abc")).toBe("abc");
  });
  it("appends env after ::", () => {
    expect(makeFieldKey("abc", "env1")).toBe("abc::env1");
  });
});

describe("parseCheckboxGroup / serializeCheckboxGroup", () => {
  it("parses null value", () => {
    expect(parseCheckboxGroup(null)).toEqual({ selected: [] });
  });

  it("parses valid JSON with selected array", () => {
    const json = JSON.stringify({ selected: ["a", "b"], other: "x" });
    expect(parseCheckboxGroup(json)).toEqual({
      selected: ["a", "b"],
      other: "x",
    });
  });

  it("returns empty for malformed JSON", () => {
    expect(parseCheckboxGroup("not json")).toEqual({ selected: [] });
  });

  it("serialize returns null when empty", () => {
    expect(serializeCheckboxGroup({ selected: [] })).toBeNull();
  });

  it("serialize includes other when present", () => {
    const out = serializeCheckboxGroup({ selected: ["a"], other: "x" });
    expect(JSON.parse(out!)).toEqual({ selected: ["a"], other: "x" });
  });

  it("roundtrip preserves data", () => {
    const value: { selected: string[]; other?: string } = {
      selected: ["a", "b"],
    };
    const out = serializeCheckboxGroup(value);
    expect(parseCheckboxGroup(out)).toEqual({ selected: ["a", "b"] });
  });
});

describe("evaluateVisible", () => {
  it("returns true when no condition", () => {
    expect(evaluateVisible(null, {})).toBe(true);
  });

  it("returns false when target field has no value", () => {
    const cond: VisibleWhen = { field_id: "a", op: "truthy" };
    expect(evaluateVisible(cond, {})).toBe(false);
  });

  it("evaluates eq", () => {
    const cond: VisibleWhen = { field_id: "a", op: "eq", value: "yes" };
    expect(evaluateVisible(cond, { a: { value: "yes" } })).toBe(true);
    expect(evaluateVisible(cond, { a: { value: "no" } })).toBe(false);
  });

  it("evaluates truthy on plain values", () => {
    const cond: VisibleWhen = { field_id: "a", op: "truthy" };
    expect(evaluateVisible(cond, { a: { value: "true" } })).toBe(true);
    expect(evaluateVisible(cond, { a: { value: "false" } })).toBe(false);
    expect(evaluateVisible(cond, { a: { value: "" } })).toBe(false);
  });

  it("evaluates truthy on checkbox_group JSON", () => {
    const cond: VisibleWhen = { field_id: "a", op: "truthy" };
    const empty = JSON.stringify({ selected: [] });
    const filled = JSON.stringify({ selected: ["x"] });
    expect(evaluateVisible(cond, { a: { value: empty } })).toBe(false);
    expect(evaluateVisible(cond, { a: { value: filled } })).toBe(true);
  });

  it("evaluates includes against checkbox_group", () => {
    const cond: VisibleWhen = { field_id: "a", op: "includes", value: "x" };
    const value = JSON.stringify({ selected: ["x", "y"] });
    expect(evaluateVisible(cond, { a: { value } })).toBe(true);
    const otherValue = JSON.stringify({ selected: ["y"] });
    expect(evaluateVisible(cond, { a: { value: otherValue } })).toBe(false);
  });

  it("respects env for keying", () => {
    const cond: VisibleWhen = { field_id: "a", op: "eq", value: "x" };
    expect(evaluateVisible(cond, { "a::env1": { value: "x" } }, "env1")).toBe(true);
  });
});

describe("isFieldAnswered", () => {
  function field(type: ClFormField["type"]): ClFormField {
    return {
      id: "f1",
      template_id: "t1",
      section_id: "s1",
      type,
      label: "F",
      required: false,
      position: 0,
      column_span: 1,
      column_offset: 0,
      visible_when: null,
      options: null,
      created_at: "",
      updated_at: "",
    } as unknown as ClFormField;
  }

  it("checkbox: true only when value is 'true'", () => {
    expect(isFieldAnswered(field("checkbox"), { value: "true" })).toBe(true);
    expect(isFieldAnswered(field("checkbox"), { value: "false" })).toBe(false);
  });

  it("checkbox_group: counts as answered with selections or other", () => {
    expect(
      isFieldAnswered(field("checkbox_group"), {
        value: JSON.stringify({ selected: ["x"] }),
      }),
    ).toBe(true);
    expect(
      isFieldAnswered(field("checkbox_group"), {
        value: JSON.stringify({ selected: [], other: "abc" }),
      }),
    ).toBe(true);
    expect(
      isFieldAnswered(field("checkbox_group"), {
        value: JSON.stringify({ selected: [] }),
      }),
    ).toBe(false);
  });

  it("text: requires non-empty trimmed value", () => {
    expect(isFieldAnswered(field("text"), { value: "  " })).toBe(false);
    expect(isFieldAnswered(field("text"), { value: "x" })).toBe(true);
    expect(isFieldAnswered(field("text"), undefined)).toBe(false);
  });
});
