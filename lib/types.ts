import type { Timestamp } from "firebase/firestore";

export type SubscriptionTier = "trial" | "starter" | "pro" | "done_for_you";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trial";
export type EntityType = "sole_prop" | "single_member_llc" | "multi_member_llc" | "s_corp" | "c_corp";

export interface UserDoc {
  email: string;
  displayName: string;
  phone?: string;
  homeStateCode: string;
  iftaBaseJurisdiction: string;
  entityType: EntityType;
  mcNumber?: string;
  usdotNumber?: string;
  ein?: string;
  cdlClass?: string;
  cdlExpiresAt?: Timestamp | null;
  medCardExpiresAt?: Timestamp | null;
  insuranceProvider?: string;
  insuranceExpiresAt?: Timestamp | null;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Timestamp | null;
  targetCpmCents?: number | null;
  expectedMonthlyMiles?: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
}

export type ReceiptCategory =
  | "fuel_diesel" | "fuel_def" | "fuel_gas_personal_vehicle"
  | "maintenance_repair" | "maintenance_oil_change" | "maintenance_tires" | "maintenance_parts"
  | "tolls" | "parking" | "scale_weighing" | "lumper_fee" | "broker_fee"
  | "permits_fees" | "insurance" | "phone_internet"
  | "office_supplies" | "shop_supplies" | "uniforms_safety_gear" | "tools_equipment"
  | "truck_wash" | "lodging" | "meals" | "showers" | "laundry" | "atm_fee"
  | "training_education" | "professional_services" | "bank_fee" | "subscription_software"
  | "medical_dot_physical" | "other_business" | "personal_non_deductible";

export type OcrStatus = "pending" | "processed" | "manual_review" | "user_corrected";

export interface ReceiptDoc {
  userId: string;
  truckId?: string | null;
  tripId?: string | null;
  imageUrl: string;
  imageThumbnailUrl?: string | null;
  originalFilename: string;
  capturedAt: Timestamp;
  transactionDate: Timestamp;
  merchantName: string;
  merchantState: string;
  totalCents: number;
  category: ReceiptCategory;
  scheduleC_Line: string;
  ocrStatus: OcrStatus;
  ocrProvider: "veryfi" | "document-ai" | "manual";
  userNotes?: string | null;
  isDeductible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
}

export interface TripDoc {
  userId: string;
  truckId: string | null;
  loadRef?: string | null;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  pickupAt: Timestamp;
  deliveredAt: Timestamp | null;
  totalMiles: number;
  loadedMiles: number;
  deadheadMiles: number;
  grossRevenueCents: number | null;
  rateConfirmationUrl?: string | null;
  notes?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
}

export interface FixedCostDoc {
  userId: string;
  truckId: string | null;
  category: string;
  label: string;
  monthlyAmountCents: number;
  effectiveFrom: Timestamp;
  effectiveTo?: Timestamp | null;
  createdAt: Timestamp;
  schemaVersion: number;
}
