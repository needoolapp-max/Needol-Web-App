import { describe, expect, it } from "vitest";
import {
  SITE_URL,
  canonical,
  jobJsonLd,
  openGraphMeta,
  postJsonLd,
  profileJsonLd,
} from "@/lib/seo";

describe("canonical", () => {
  it("absolute URL stays absolute", () => {
    expect(canonical("https://example.com/x")).toBe("https://example.com/x");
  });
  it("relative path normalized with leading slash", () => {
    expect(canonical("p/ada.codes")).toBe(`${SITE_URL}/p/ada.codes`);
    expect(canonical("/p/ada.codes")).toBe(`${SITE_URL}/p/ada.codes`);
  });
});

describe("profileJsonLd", () => {
  it("emits Person for Individual", () => {
    const ld = JSON.parse(profileJsonLd({
      username: "ada", name: "Ada", accountType: "Individual",
    }));
    expect(ld["@type"]).toBe("Person");
    expect(ld.url).toBe(`${SITE_URL}/p/ada`);
    expect(ld.identifier).toBe("@ada");
  });
  it("emits LocalBusiness for Business", () => {
    const ld = JSON.parse(profileJsonLd({
      username: "acme", name: "Acme Co", accountType: "Business",
    }));
    expect(ld["@type"]).toBe("LocalBusiness");
  });
  it("populates address when location fields are set (PRD §4.4)", () => {
    const ld = JSON.parse(profileJsonLd({
      username: "x", name: "X", accountType: "Individual",
      country: "Nigeria", state: "Lagos", city: "Ikeja",
    }));
    expect(ld.address["@type"]).toBe("PostalAddress");
    expect(ld.address.addressCountry).toBe("Nigeria");
    expect(ld.address.addressLocality).toBe("Ikeja");
  });
  it("omits address when no location set", () => {
    const ld = JSON.parse(profileJsonLd({
      username: "x", name: "X", accountType: "Individual",
    }));
    expect(ld.address).toBeUndefined();
  });
});

describe("postJsonLd", () => {
  it("Event posts use schema.org Event type", () => {
    const ld = JSON.parse(postJsonLd({
      id: "e1", kind: "event", title: "Lagos meetup",
      payload: { event_type: "Online", datetime: "2026-07-01T18:00Z" },
    }));
    expect(ld["@type"]).toBe("Event");
    expect(ld.eventAttendanceMode).toContain("OnlineEventAttendanceMode");
    expect(ld.startDate).toBe("2026-07-01T18:00Z");
  });
  it("Need posts use CreativeWork", () => {
    const ld = JSON.parse(postJsonLd({
      id: "n1", kind: "need", title: "Need a designer",
    }));
    expect(ld["@type"]).toBe("CreativeWork");
    expect(ld.headline).toBe("Need a designer");
  });
});

describe("jobJsonLd", () => {
  it("emits JobPosting with normalized employmentType", () => {
    const ld = JSON.parse(jobJsonLd({
      id: "j1", title: "React dev", employmentType: "Full-time",
    }));
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.employmentType).toBe("FULL_TIME");
    expect(ld.hiringOrganization.name).toBe("Needool");
  });
});

describe("openGraphMeta", () => {
  it("includes og:title + og:url + twitter:card", () => {
    const arr = openGraphMeta({ title: "Hello", url: "https://example.com" });
    const props = Object.fromEntries(arr.map((m) => [m.property || m.name, m.content]));
    expect(props["og:title"]).toBe("Hello");
    expect(props["og:url"]).toBe("https://example.com");
    expect(props["twitter:card"]).toBe("summary_large_image");
  });
  it("adds image entries when provided", () => {
    const arr = openGraphMeta({ title: "T", url: "u", image: "https://img" });
    const props = arr.filter((m) => (m.property || m.name)?.includes("image"));
    expect(props.length).toBeGreaterThanOrEqual(2);
  });
});
