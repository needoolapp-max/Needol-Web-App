import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("concatenates class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters out falsy", () => {
    expect(cn("a", null, undefined, false, "b")).toBe("a b");
  });

  it("dedupes tailwind classes with tailwind-merge", () => {
    expect(cn("px-2 px-4")).toBe("px-4");
    expect(cn("p-2 px-4")).toBe("p-2 px-4");
  });

  it("merges conditional class objects", () => {
    expect(cn("base", { "is-active": true, "is-disabled": false })).toBe("base is-active");
  });
});
