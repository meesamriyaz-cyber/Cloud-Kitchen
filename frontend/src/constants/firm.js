export const DEFAULT_FIRM = {
  name: "Your Restaurant",
  short_name: "Your Restaurant",
  tagline: "Fresh food, made for every order",
  business_type: "Restaurant",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  gst: "",
  website: "",
  fssai: "",
  upi_id: "",
  currency: "INR",
  theme_color: "#C2410C",
  setup_complete: false,
};

export const FIRM = DEFAULT_FIRM;

export function normalizeFirm(raw = {}) {
  const firm = { ...DEFAULT_FIRM, ...(raw || {}) };
  firm.name = firm.name || DEFAULT_FIRM.name;
  firm.short_name = firm.short_name || firm.name;
  firm.tagline = firm.tagline || DEFAULT_FIRM.tagline;
  firm.business_type = firm.business_type || DEFAULT_FIRM.business_type;
  firm.currency = firm.currency || DEFAULT_FIRM.currency;
  firm.theme_color = firm.theme_color || DEFAULT_FIRM.theme_color;
  return firm;
}

export function firmShortName(firm = DEFAULT_FIRM) {
  return firm.short_name || firm.name || DEFAULT_FIRM.short_name;
}

export const receiptWidthMm = 58;
