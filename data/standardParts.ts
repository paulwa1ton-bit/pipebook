// Built-in list of common UK plumbing and heating parts. No prices: the
// plumber's own price comes from their supplier price lists or what they
// last charged. Names are what goes on the invoice line; descriptions help
// pick the right thing.

export type PartCategory =
  | "Pipe"
  | "Fittings"
  | "Valves"
  | "Boilers"
  | "Heating"
  | "Controls"
  | "Hot water"
  | "Taps & showers"
  | "Toilets & basins"
  | "Waste & drainage"
  | "Gas"
  | "Consumables";

export interface StandardPart {
  name: string;
  category: PartCategory;
  description: string;
}

const part = (category: PartCategory) => (name: string, description: string): StandardPart => ({ name, category, description });

const sizes = (category: PartCategory, list: number[], name: (mm: number) => string, description: string) =>
  list.map((mm) => part(category)(name(mm), description));

const pipe = part("Pipe");
const fit = part("Fittings");
const valve = part("Valves");
const boiler = part("Boilers");
const heat = part("Heating");
const ctrl = part("Controls");
const hw = part("Hot water");
const tap = part("Taps & showers");
const san = part("Toilets & basins");
const waste = part("Waste & drainage");
const gas = part("Gas");
const cons = part("Consumables");

export const STANDARD_PARTS: StandardPart[] = [
  // Pipe
  ...sizes("Pipe", [8, 10, 15, 22, 28], (mm) => `${mm}mm copper pipe (3m)`, "Table X / EN 1057 R250 half-hard copper tube, 3m length"),
  ...sizes("Pipe", [8, 10], (mm) => `${mm}mm copper microbore coil`, "Soft copper coil for microbore heating runs"),
  ...sizes("Pipe", [15, 22], (mm) => `${mm}mm plastic barrier pipe (3m)`, "PE-X / polybutylene push-fit pipe (Hep2O, JG Speedfit type), straight length"),
  ...sizes("Pipe", [10, 15, 22], (mm) => `${mm}mm plastic barrier pipe coil`, "PE-X / polybutylene push-fit pipe on a coil"),
  ...sizes("Pipe", [15, 22], (mm) => `${mm}mm pipe insert`, "Stainless support insert for plastic pipe in push-fit or compression fittings"),
  ...sizes("Pipe", [20, 25, 32], (mm) => `${mm}mm MDPE blue water pipe`, "Underground cold water main pipe, sold by the metre or coil"),
  ...sizes("Pipe", [15, 22, 28], (mm) => `${mm}mm chrome-plated copper pipe`, "Polished chrome copper for exposed runs to radiators, taps and WCs"),

  // Fittings
  ...[15, 22, 28].flatMap((mm) => [
    fit(`${mm}mm end feed straight coupler`, "Copper solder fitting joining two pipes"),
    fit(`${mm}mm end feed elbow`, "Copper 90° solder elbow"),
    fit(`${mm}mm end feed equal tee`, "Copper solder tee"),
    fit(`${mm}mm solder ring straight coupler`, "Yorkshire-type pre-soldered coupler"),
    fit(`${mm}mm solder ring elbow`, "Yorkshire-type pre-soldered 90° elbow"),
    fit(`${mm}mm solder ring equal tee`, "Yorkshire-type pre-soldered tee"),
    fit(`${mm}mm compression straight coupler`, "Brass compression coupler with olives and nuts"),
    fit(`${mm}mm compression elbow`, "Brass compression 90° elbow"),
    fit(`${mm}mm compression equal tee`, "Brass compression tee"),
    fit(`${mm}mm push-fit straight coupler`, "Plastic or brass push-fit coupler for copper or plastic pipe"),
    fit(`${mm}mm push-fit elbow`, "Push-fit 90° elbow"),
    fit(`${mm}mm push-fit equal tee`, "Push-fit tee"),
    fit(`${mm}mm stop end`, "Caps off a pipe end (solder, compression or push-fit)"),
  ]),
  fit("22mm x 15mm reducing tee", "Tee with a 15mm branch off a 22mm run"),
  fit("22mm x 15mm reducer", "Reduces 22mm pipe down to 15mm"),
  fit("28mm x 22mm reducer", "Reduces 28mm pipe down to 22mm"),
  fit("15mm x 1/2\" male iron adaptor", "Pipe to 1/2\" BSP male thread"),
  fit("15mm x 1/2\" female iron adaptor", "Pipe to 1/2\" BSP female thread"),
  fit("22mm x 3/4\" male iron adaptor", "Pipe to 3/4\" BSP male thread"),
  fit("22mm x 3/4\" female iron adaptor", "Pipe to 3/4\" BSP female thread"),
  fit("15mm tap connector (bent)", "Connects pipe to a 1/2\" tap tail"),
  fit("15mm x 1/2\" flexible tap connector", "Braided flexible hose, pipe to 1/2\" tap tail"),
  fit("22mm x 3/4\" flexible tap connector", "Braided flexible hose, pipe to 3/4\" bath tap tail"),
  fit("15mm tank connector", "Connects pipe through the side of a cistern or tank"),
  fit("22mm tank connector", "Connects pipe through the side of a cistern or tank"),
  fit("15mm wall plate elbow", "Elbow with fixing plate, for outside taps and shower outlets"),
  fit("15mm swept tee", "Swept-branch tee for neater flow on heating circuits"),
  fit("22mm 45° elbow", "Half-bend elbow"),
  fit("15mm 45° elbow", "Half-bend elbow"),

  // Valves
  valve("15mm isolation valve", "Quarter-turn service valve, slotted or with lever"),
  valve("22mm isolation valve", "Quarter-turn service valve"),
  valve("15mm stopcock", "Brass stop tap for the incoming cold main"),
  valve("22mm stopcock", "Brass stop tap for the incoming cold main"),
  valve("15mm gate valve", "Full-bore gate valve for low-pressure supplies"),
  valve("22mm gate valve", "Full-bore gate valve for low-pressure supplies"),
  valve("28mm gate valve", "Full-bore gate valve for low-pressure supplies"),
  valve("15mm lever ball valve", "Full-bore quarter-turn lever valve"),
  valve("22mm lever ball valve", "Full-bore quarter-turn lever valve"),
  valve("15mm double check valve", "Prevents backflow, e.g. on filling loops and outside taps"),
  valve("22mm double check valve", "Prevents backflow"),
  valve("15mm drain cock", "Drain-off valve for draining systems"),
  valve("15mm thermostatic radiator valve (TRV)", "Thermostatic radiator valve with head, angled or straight"),
  valve("Radiator valves (pair, manual)", "Wheelhead and lockshield valve pair"),
  valve("Lockshield valve", "Radiator balancing valve"),
  valve("TRV head", "Replacement thermostatic head"),
  valve("22mm 2-port motorised zone valve", "Motorised valve for S-plan heating/hot water zoning"),
  valve("22mm 3-port mid-position valve", "Motorised diverter valve for Y-plan systems"),
  valve("Motorised valve actuator head", "Replacement powerhead for a 2-port or 3-port valve"),
  valve("22mm automatic bypass valve", "Keeps minimum flow through the boiler when TRVs close"),
  valve("15mm pressure reducing valve", "Reduces incoming mains pressure"),
  valve("15mm pressure relief valve (3 bar)", "Safety relief valve for sealed heating systems"),
  valve("15mm thermostatic mixing valve (TMV)", "Blends hot and cold to a safe outlet temperature"),
  valve("15mm tundish", "Visible air break on discharge pipework from relief valves"),
  valve("Float valve (ball valve), side entry", "Fill valve for cisterns and cold water tanks"),
  valve("Float valve (ball valve), bottom entry", "Fill valve for cisterns"),
  valve("Washing machine valve", "Self-cutting or tee appliance valve with lever"),
  valve("15mm outside tap kit", "Outside tap with wall plate, check valve and fittings"),
  valve("Outside tap (bib tap)", "1/2\" bib tap with hose union"),

  // Boilers
  boiler("Combi boiler", "Combination boiler, heating and instant hot water, no cylinder"),
  boiler("System boiler", "Sealed system boiler with built-in pump and expansion vessel, for use with a cylinder"),
  boiler("Regular (heat-only) boiler", "Conventional boiler for open-vented systems with tanks and cylinder"),
  boiler("Worcester Bosch Greenstar 4000 combi boiler (25kW)", "Gas combi boiler"),
  boiler("Worcester Bosch Greenstar 4000 combi boiler (30kW)", "Gas combi boiler"),
  boiler("Worcester Bosch Greenstar 8000 Life combi boiler", "Gas combi boiler"),
  boiler("Vaillant ecoTEC plus combi boiler", "Gas combi boiler"),
  boiler("Vaillant ecoTEC pro combi boiler", "Gas combi boiler"),
  boiler("Ideal Logic Max Combi2 boiler", "Gas combi boiler"),
  boiler("Baxi 800 Combi 2 boiler", "Gas combi boiler"),
  boiler("Viessmann Vitodens 100-W combi boiler", "Gas combi boiler"),
  boiler("Horizontal flue kit", "Standard telescopic or fixed horizontal flue for the boiler"),
  boiler("Vertical flue kit", "Roof flue kit for the boiler"),
  boiler("Flue extension (1m)", "Extends a boiler flue run"),
  boiler("Flue bend (90°)", "Elbow for boiler flue runs"),
  boiler("Boiler wall plate / jig", "Mounting plate and pipe jig for the boiler"),
  boiler("Boiler PCB", "Replacement printed circuit board (model specific)"),
  boiler("Boiler diverter valve", "Replacement diverter valve (model specific)"),
  boiler("Boiler fan", "Replacement fan (model specific)"),
  boiler("Boiler pump", "Replacement internal pump (model specific)"),
  boiler("Boiler pressure sensor", "Replacement pressure sensor/switch (model specific)"),
  boiler("Boiler ignition electrode", "Replacement spark/ignition electrode (model specific)"),
  boiler("Plate heat exchanger", "Domestic hot water heat exchanger for combi boilers (model specific)"),

  // Heating
  heat("Type 11 single panel radiator", "Single panel, single convector radiator (specify height x width)"),
  heat("Type 21 double panel plus radiator", "Double panel, single convector radiator (specify height x width)"),
  heat("Type 22 double panel radiator", "Double panel, double convector radiator (specify height x width)"),
  heat("Heated towel rail", "Ladder-style towel radiator (specify size and finish)"),
  heat("Radiator brackets (pair)", "Wall brackets for panel radiators"),
  heat("Radiator tails and blanking plugs", "Replacement radiator tail and plug set"),
  heat("Radiator bleed valve / key", "Air vent valve or bleed key"),
  heat("Automatic air vent", "Releases air from high points in heating systems"),
  heat("Magnetic system filter (22mm)", "Inline magnetic filter, e.g. Fernox TF1 or Adey MagnaClean"),
  heat("Magnetic system filter (28mm)", "Inline magnetic filter for larger pipework"),
  heat("Circulating pump", "Central heating circulator, e.g. Grundfos UPS2 15-50/60"),
  heat("Pump valves (pair)", "Isolating valves for the circulating pump"),
  heat("Expansion vessel (8L)", "Sealed system expansion vessel"),
  heat("Expansion vessel (12L)", "Sealed system expansion vessel"),
  heat("Expansion vessel (18L)", "Sealed system expansion vessel"),
  heat("Expansion vessel (24L)", "Sealed system expansion vessel"),
  heat("Filling loop", "Braided filling loop with valves for sealed systems"),
  heat("Pressure gauge", "System pressure gauge"),
  heat("Central heating inhibitor", "Protects the system from corrosion, e.g. Fernox F1 or Sentinel X100"),
  heat("Central heating cleaner", "Cleans sludge and debris, e.g. Fernox F3 or Sentinel X400"),
  heat("Power flush chemicals", "Cleaning chemicals for a system power flush"),
  heat("Leak sealer", "Seals minor leaks in heating systems, e.g. Fernox F4"),
  heat("Scale reducer", "Inline scale inhibitor for incoming water to the boiler"),
  heat("21.5mm condensate pipe", "Plastic condensate drain pipe"),
  heat("32mm condensate pipe", "Larger condensate pipe for external runs (frost protection)"),
  heat("Condensate trap / siphon", "Trap for connecting the condensate pipe into waste"),
  heat("Condensate pump", "Pumps condensate where gravity drainage isn't possible"),
  heat("Underfloor heating manifold", "Wet UFH manifold with flow meters"),
  heat("Underfloor heating pipe (16mm)", "PE-RT or PE-X UFH pipe, per coil"),

  // Controls
  ctrl("Programmable room thermostat", "Wired or wireless programmable thermostat"),
  ctrl("Wireless room thermostat", "Battery wireless thermostat with receiver"),
  ctrl("Smart thermostat", "App-controlled thermostat, e.g. Hive, Nest or tado°"),
  ctrl("Smart radiator thermostat", "App-controlled TRV head"),
  ctrl("Heating programmer / timer", "Time controller for heating and hot water"),
  ctrl("Cylinder thermostat", "Strap-on thermostat for hot water cylinders"),
  ctrl("Wiring centre", "Junction box for S-plan / Y-plan wiring"),
  ctrl("Frost thermostat", "Brings heating on to protect against freezing"),
  ctrl("Fused spur", "Fused connection unit for the boiler or controls"),

  // Hot water
  hw("Unvented hot water cylinder (150L)", "Mains pressure cylinder, direct or indirect"),
  hw("Unvented hot water cylinder (210L)", "Mains pressure cylinder, direct or indirect"),
  hw("Unvented hot water cylinder (250L)", "Mains pressure cylinder, direct or indirect"),
  hw("Vented hot water cylinder", "Copper indirect cylinder for open-vented systems (specify size)"),
  hw("Immersion heater (11\")", "Electric immersion element"),
  hw("Immersion heater (14\")", "Electric immersion element"),
  hw("Immersion heater (27\")", "Electric immersion element"),
  hw("Immersion heater thermostat", "Replacement immersion thermostat"),
  hw("Immersion heater spanner", "Box spanner for removing immersion elements"),
  hw("Unvented cylinder expansion relief valve", "Replacement ERV / pressure relief for unvented cylinders"),
  hw("Temperature and pressure relief valve (T&P)", "Safety valve for unvented cylinders"),
  hw("Cold water storage tank", "Loft cold water tank with lid and insulation (specify size)"),
  hw("Feed and expansion (F&E) tank", "Small header tank for open-vented heating"),
  hw("Tank insulation jacket", "Insulation for cylinders or loft tanks"),
  hw("Electric water heater", "Point-of-use or undersink electric water heater"),

  // Taps & showers
  tap("Basin mixer tap", "Monobloc basin mixer with waste"),
  tap("Kitchen sink mixer tap", "Monobloc kitchen mixer"),
  tap("Bath filler / bath taps", "Bath mixer or pair of bath taps"),
  tap("Bath shower mixer", "Bath tap with shower hose and handset"),
  tap("Ceramic tap cartridge", "Replacement quarter-turn cartridge (1/2\" or 3/4\")"),
  tap("Tap washers (assorted)", "Rubber washers for traditional taps"),
  tap("Tap reseating tool", "For re-cutting worn tap seats"),
  tap("Thermostatic bar mixer shower", "Exposed thermostatic shower valve with riser kit"),
  tap("Concealed thermostatic shower valve", "Built-in shower valve"),
  tap("Electric shower", "Electric shower unit (specify kW)"),
  tap("Shower hose", "Replacement shower hose (1.5m / 1.75m)"),
  tap("Shower head", "Replacement handset or fixed head"),
  tap("Shower riser rail kit", "Riser rail with slider, hose and handset"),
  tap("Shower pump", "Positive or negative head shower pump"),

  // Toilets & basins
  san("Toilet (close-coupled WC)", "Close-coupled pan and cistern"),
  san("Toilet fill valve", "Replacement cistern fill valve, e.g. Fluidmaster or Siamp"),
  san("Toilet flush valve", "Replacement dual-flush valve"),
  san("Toilet siphon", "Replacement siphon for lever-flush cisterns"),
  san("Dual flush push button", "Replacement push button set"),
  san("Close coupling kit", "Bolts, washers and doughnut seal for close-coupled WCs"),
  san("Pan connector", "Flexible or rigid WC pan connector"),
  san("Toilet seat", "Replacement WC seat"),
  san("Cistern lever", "Replacement flush lever"),
  san("Basin and pedestal", "Wash basin with full or semi pedestal"),
  san("Basin waste (click-clack)", "Sprung pop-up basin waste"),
  san("Bath waste and overflow", "Bath waste with overflow, plug and chain or pop-up"),
  san("Kitchen sink waste kit", "Sink waste with overflow and appliance spigot"),
  san("Shower tray waste", "90mm shower tray waste"),
  san("Macerator / sanitary pump", "Pump for WC or shower where gravity drainage isn't possible"),

  // Waste & drainage
  ...sizes("Waste & drainage", [32, 40, 50], (mm) => `${mm}mm solvent weld waste pipe (3m)`, "ABS / MUPVC waste pipe"),
  ...sizes("Waste & drainage", [32, 40], (mm) => `${mm}mm push-fit waste pipe (3m)`, "Polypropylene push-fit waste pipe"),
  ...sizes("Waste & drainage", [32, 40], (mm) => `${mm}mm waste elbow`, "Solvent weld or push-fit waste bend"),
  ...sizes("Waste & drainage", [32, 40], (mm) => `${mm}mm waste tee`, "Solvent weld or push-fit waste tee"),
  waste("32mm bottle trap", "Basin trap"),
  waste("40mm bottle trap", "Sink trap"),
  waste("40mm P-trap", "Trap for sinks and baths"),
  waste("40mm S-trap", "Trap for vertical waste runs"),
  waste("Bath trap (low profile)", "Shallow seal trap for baths and shower trays"),
  waste("Washing machine trap / standpipe", "Appliance standpipe with trap"),
  waste("Anti-siphon trap", "Prevents trap seal loss"),
  waste("Air admittance valve", "Lets air into soil or waste stacks without a vent pipe"),
  waste("110mm soil pipe (3m)", "Solvent or push-fit soil pipe"),
  waste("110mm soil bend", "Soil pipe bend"),
  waste("110mm boss connector", "Connects a waste pipe into a soil stack"),
  waste("Strap-on boss", "Clamp-on connector for adding a waste into a soil pipe"),
  waste("Waste pipe clips", "Clips for 32mm / 40mm waste pipe"),

  // Gas
  gas("15mm gas isolation valve", "Lever gas cock (BS EN 331)"),
  gas("22mm gas isolation valve", "Lever gas cock (BS EN 331)"),
  gas("Gas hob connection hose", "Bayonet hose for cookers and hobs"),
  gas("Bayonet gas connector", "Wall bayonet socket for cooker hoses"),
  gas("Gas meter flexible connector", "Meter outlet connector"),
  gas("Gas pipe sleeve", "Sleeve for gas pipe passing through walls"),
  gas("Carbon monoxide alarm", "Battery CO alarm"),

  // Consumables
  cons("PTFE tape", "Thread sealing tape"),
  cons("Jointing compound", "Thread / compression jointing paste, e.g. Boss White or Fernox LS-X"),
  cons("Flux", "Soldering flux for copper"),
  cons("Lead-free solder", "Solder wire for end feed fittings"),
  cons("Silicone sealant", "Sanitary silicone, white or clear"),
  cons("15mm olives (bag)", "Brass compression olives"),
  cons("22mm olives (bag)", "Brass compression olives"),
  cons("15mm pipe clips (bag)", "Plastic pipe clips"),
  cons("22mm pipe clips (bag)", "Plastic pipe clips"),
  cons("15mm pipe insulation", "Foam lagging, per length"),
  cons("22mm pipe insulation", "Foam lagging, per length"),
  cons("28mm pipe insulation", "Foam lagging, per length"),
  cons("Abrasive cloth / wire wool", "For cleaning pipe before soldering"),
  cons("Solvent cement", "Adhesive for solvent weld waste pipe"),
  cons("Expanding foam", "Gap filling foam, fire rated where required"),
  cons("Fixings (screws and plugs)", "Assorted wall fixings"),
  cons("MAPP / propane gas cartridge", "Blowtorch gas"),
  cons("Fibre washers (assorted)", "Washers for tap connectors and unions"),
];

export const PART_CATEGORIES: PartCategory[] = [
  "Pipe", "Fittings", "Valves", "Boilers", "Heating", "Controls", "Hot water",
  "Taps & showers", "Toilets & basins", "Waste & drainage", "Gas", "Consumables",
];
