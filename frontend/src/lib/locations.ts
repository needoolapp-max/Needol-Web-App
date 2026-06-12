// Phase 10-2 — Onboarding location data. Country list + region map for the
// markets Needool serves. Static, bundled, no network round-trip on form
// open (~6KB minified). Country code = ISO 3166-1 alpha-2. Region list
// covers Nigeria (36 states + FCT), United States (50 states + DC), United
// Kingdom (4 nations + 9 English regions), Canada (10 provinces + 3
// territories), and the African markets we care most about. Countries
// without a regions entry fall back to a free-text input on the form side.

export type Country = { code: string; name: string };

export const COUNTRIES: readonly Country[] = [
  { code: "NG", name: "Nigeria" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BJ", name: "Benin" },
  { code: "BR", name: "Brazil" },
  { code: "CM", name: "Cameroon" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "ET", name: "Ethiopia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KE", name: "Kenya" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NO", name: "Norway" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "RW", name: "Rwanda" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "VN", name: "Vietnam" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
] as const;

const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const UK_REGIONS = [
  "England — East Midlands", "England — East of England", "England — London",
  "England — North East", "England — North West", "England — South East",
  "England — South West", "England — West Midlands",
  "England — Yorkshire and the Humber",
  "Northern Ireland", "Scotland", "Wales",
];

const CA_REGIONS = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
  "Yukon",
];

const AU_STATES = [
  "Australian Capital Territory", "New South Wales", "Northern Territory",
  "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia",
];

const KE_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
  "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
  "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale",
  "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru",
  "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok",
  "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta",
  "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu",
  "Vihiga", "Wajir", "West Pokot",
];

const GH_REGIONS = [
  "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern",
  "Greater Accra", "North East", "Northern", "Oti", "Savannah", "Upper East",
  "Upper West", "Volta", "Western", "Western North",
];

const ZA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
];

const IN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

const DE_STATES = [
  "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern",
  "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony",
  "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
];

/**
 * Region (state / province / county) options keyed by ISO country code.
 * Missing entries mean "let the user type freely" on the form side.
 */
export const REGIONS_BY_COUNTRY: Readonly<Record<string, readonly string[]>> = {
  NG: NG_STATES,
  US: US_STATES,
  GB: UK_REGIONS,
  CA: CA_REGIONS,
  AU: AU_STATES,
  KE: KE_COUNTIES,
  GH: GH_REGIONS,
  ZA: ZA_PROVINCES,
  IN: IN_STATES,
  DE: DE_STATES,
};

/** Lookup helper. Returns the readable country name, or "" if unknown. */
export function countryNameByCode(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? "";
}

/** Lookup helper. Returns the ISO code for a country name, or "" if unknown. */
export function countryCodeByName(name: string): string {
  const lower = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === lower)?.code ?? "";
}

/** True if the country has region data bundled. */
export function hasRegions(countryCode: string): boolean {
  return Array.isArray(REGIONS_BY_COUNTRY[countryCode]);
}
