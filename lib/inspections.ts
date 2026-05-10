export type InspectionCategory = "engine" | "brakes" | "lights" | "tires" | "cab" | "trailer";
export type ItemStatus = "pending" | "pass" | "fail" | "skip";

export type InspectionItem = {
  id: string;
  label: string;
  category: InspectionCategory;
};

export const INSPECTION_ITEMS: InspectionItem[] = [
  { id: "oil_level",            label: "Engine oil level",                                  category: "engine" },
  { id: "coolant_level",        label: "Coolant level",                                     category: "engine" },
  { id: "power_steering_fluid", label: "Power steering fluid",                              category: "engine" },
  { id: "battery",              label: "Battery (connections, charge)",                     category: "engine" },
  { id: "air_compressor",       label: "Air compressor",                                    category: "engine" },
  { id: "belts_hoses",          label: "Belts & hoses (no cracks/wear)",                   category: "engine" },

  { id: "service_brakes",  label: "Service brakes",                                         category: "brakes" },
  { id: "parking_brakes",  label: "Parking / trailer brakes",                               category: "brakes" },
  { id: "air_pressure",    label: "Air pressure (90–120 PSI)",                              category: "brakes" },
  { id: "air_lines",       label: "Air lines (emergency & service)",                        category: "brakes" },
  { id: "brake_drums",     label: "Brake drums / rotors (no cracks)",                       category: "brakes" },

  { id: "headlights",     label: "Headlights (high & low beam)",                            category: "lights" },
  { id: "taillights",     label: "Taillights",                                              category: "lights" },
  { id: "brake_lights",   label: "Brake lights",                                            category: "lights" },
  { id: "turn_signals",   label: "Turn signals (front & rear)",                             category: "lights" },
  { id: "marker_lights",  label: "Clearance / marker lights",                               category: "lights" },
  { id: "hazard_lights",  label: "Hazard / four-way flashers",                              category: "lights" },
  { id: "reverse_lights", label: "Reverse lights",                                          category: "lights" },

  { id: "front_tires",     label: "Front tires (tread ≥ 4/32\", pressure, sidewall)",      category: "tires" },
  { id: "drive_tires",     label: "Drive tires (tread ≥ 2/32\")",                          category: "tires" },
  { id: "trailer_tires",   label: "Trailer tires",                                          category: "tires" },
  { id: "wheel_fasteners", label: "Wheel fasteners / lug nuts (tight)",                     category: "tires" },
  { id: "hub_seals",       label: "Hub seals (no leaks)",                                   category: "tires" },
  { id: "rims",            label: "Rims (no cracks or damage)",                             category: "tires" },

  { id: "windshield",          label: "Windshield (no cracks blocking view)",               category: "cab" },
  { id: "wipers",              label: "Windshield wipers & washer fluid",                   category: "cab" },
  { id: "mirrors",             label: "Mirrors (adjusted & secure)",                        category: "cab" },
  { id: "horn",                label: "Horn",                                               category: "cab" },
  { id: "steering",            label: "Steering (free play < 10°)",                        category: "cab" },
  { id: "seat_belt",           label: "Seat belt",                                          category: "cab" },
  { id: "gauges",              label: "Dashboard gauges (fuel, temp, oil)",                 category: "cab" },
  { id: "fire_extinguisher",   label: "Fire extinguisher (charged)",                        category: "cab" },
  { id: "emergency_triangles", label: "Emergency triangles (3×)",                           category: "cab" },
  { id: "first_aid",           label: "First-aid kit",                                      category: "cab" },

  { id: "fifth_wheel",         label: "Fifth wheel / kingpin coupling (locked)",            category: "trailer" },
  { id: "safety_chains",       label: "Safety chains / security",                           category: "trailer" },
  { id: "trailer_lights_conn", label: "Trailer lights connection",                          category: "trailer" },
  { id: "air_lines_conn",      label: "Air lines connection (glad hands)",                  category: "trailer" },
  { id: "landing_gear",        label: "Landing gear (retracted & secure)",                  category: "trailer" },
  { id: "trailer_doors",       label: "Trailer doors & seals",                              category: "trailer" },
  { id: "cargo_security",      label: "Cargo / load securement",                            category: "trailer" },
];

export const CATEGORIES: InspectionCategory[] = ["engine", "brakes", "lights", "tires", "cab", "trailer"];

export const CATEGORY_LABELS: Record<InspectionCategory, string> = {
  engine:  "Engine / Under Hood",
  brakes:  "Brakes",
  lights:  "Lights",
  tires:   "Tires & Wheels",
  cab:     "Cab / Interior",
  trailer: "Coupling & Trailer",
};
