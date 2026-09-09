/**
 * @file: src/content/formulation.js
 * @author: Stephen Boyett
 *
 * @description:
 *     General domain knowledge for the Sol chatbot — colloid science, beverage
 *     process constraints, and botanical/fungal formulation facts. Deliberately
 *     technical rather than therapeutic: nothing here describes a health effect.
 *     See src/content/CLAUDE.md § Why the domain knowledge avoids efficacy.
 *
 * @See Also:
 *     functions/lib/persona.js
 *     scripts/build-knowledge-base.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const emulsionScience = {
  title: 'Nanoemulsion and colloid science',
  facts: [
    'An emulsion disperses one immiscible liquid in another. Beverage work is almost always oil-in-water (O/W): oil-soluble actives dispersed through a water continuous phase.',
    'Size classes: conventional/macroemulsions sit above roughly 1 micron; nanoemulsions fall roughly between 20 and 200 nanometers; microemulsions are thermodynamically stable systems requiring high surfactant loads. Nanoemulsions are kinetically stable, not thermodynamically stable — they are engineered to resist breakdown, not immune to it.',
    'Clarity is a function of droplet size versus the wavelength of visible light (~400-700 nm). Droplets far smaller than that scatter very little light, which is why sub-20nm systems look transparent while micron-scale dispersions look cloudy or milky.',
    'The four ways an emulsion fails: creaming (droplets rise), sedimentation (droplets sink), flocculation (droplets clump but stay distinct), and coalescence (droplets merge irreversibly). Ostwald ripening — small droplets dissolving and re-depositing onto larger ones — is the dominant long-term mechanism in nanoemulsions specifically.',
    'Surfactants stabilise the interface. HLB (hydrophilic-lipophilic balance) guides selection; O/W systems generally want a high-HLB surfactant. Common food-grade choices include polysorbates, sucrose esters, lecithin, gum arabic and quillaja saponin.',
    'Zeta potential describes the electrostatic charge at the droplet surface. Larger magnitude generally means stronger droplet-droplet repulsion and better resistance to flocculation.',
    'High-energy production methods include ultrasonic cavitation, high-pressure homogenisation and microfluidisation. Low-energy methods include spontaneous emulsification and phase-inversion temperature. High-energy methods give tighter control of particle size distribution.',
    'Ultrasonic processing works by acoustic cavitation: bubbles collapse violently and the resulting shear tears droplets apart. Throughput scales with power and residence time, which is why processor wattage matters for commercial-scale work.',
    'Polydispersity index (PDI) describes how tight the size distribution is. A low PDI means a uniform population, which matters more for dose consistency than the mean size alone.',
    'Bioavailability gains from nanoemulsification are generally attributed to greatly increased interfacial surface area, improved dispersion in gastrointestinal fluid, and easier incorporation into mixed micelles.',
  ],
};

export const beverageProcess = {
  title: 'Beverage formulation and process constraints',
  facts: [
    'Most carbonated soft drinks and functional beverages sit at pH 2.5 to 4.0. Acidulants include citric, malic, phosphoric and ascorbic acid. Low pH is a stress condition for emulsions because it can compress the electrostatic double layer.',
    'Preservation routes: hot-fill (typically around 85C fill), tunnel pasteurisation, cold-fill with a preservative system (commonly benzoate/sorbate at low pH), aseptic filling, or high-pressure processing (HPP). Thermal steps are a stability stress test for any emulsion.',
    'Carbonation introduces mechanical and interfacial stress and can promote creaming. Emulsion behaviour must be validated in the actual carbonated matrix, not in flat water.',
    '"Ringing" or "necking" is the visible oil ring at the liquid surface in the bottle neck — a classic creaming failure and the most common consumer-visible emulsion defect.',
    'Ionic strength matters. Hard water, mineral blends and electrolyte additions can screen droplet surface charge and destabilise an otherwise sound emulsion.',
    'Common sweetener systems: sucrose, fructose, stevia (Reb A/Reb M), monk fruit, allulose, erythritol. Some high-intensity sweeteners carry their own bitterness or licorice notes that interact with a botanical bitter profile.',
    'Accelerated stability testing typically holds samples at elevated temperature (for example 40C) and compares against real-time ambient and refrigerated controls. Freeze-thaw cycling is a separate and often harsher test.',
    'Typical evaluation methods: dynamic light scattering for particle size and PDI, turbidity/nephelometry for clarity, visual inspection for ringing and sediment, and sensory panels for flavour drift over shelf life.',
    'Every formulation change is a new stability study. Flavour systems, acids, sweeteners, colours, preservatives and the emulsion all interact.',
    'Ingredient statements, allergen declarations, structure/function language and permitted claims vary by market and are the brand\'s regulatory responsibility, not the supplier\'s.',
  ],
};

export const kavaBotany = {
  title: 'Kava — botanical and chemical background',
  facts: [
    'Kava is Piper methysticum, a member of the pepper family, traditionally cultivated and consumed across the Pacific Islands including Fiji, Vanuatu, Tonga and Hawaii.',
    'The characteristic constituents are kavalactones. The six principal ones are kavain, dihydrokavain, methysticin, dihydromethysticin, yangonin and desmethoxyyangonin.',
    'Cultivars are described by a six-digit chemotype code giving the relative order of those six kavalactones, which is why two kava lots with the same total kavalactone percentage can behave and taste differently.',
    '"Noble" cultivars are the traditionally consumed varieties. "Tudei" (two-day) and wild varieties are outside that tradition and are excluded from quality supply chains. Cannasol uses noble varieties only.',
    'Kavalactones are strongly lipophilic and poorly water-soluble. That single property is the root formulation problem: traditional extracts disperse badly in water-based beverages, which drives cloudiness, sedimentation and inconsistent dosing.',
    'Extraction routes include water, ethanol, acetone-free hydroalcoholic systems and supercritical CO2. The route affects the kavalactone profile and the residual plant matrix.',
    'Kava carries a distinctive bitter, earthy, astringent profile and a characteristic mouthfeel. Bitterness management is a normal part of beverage development with conventional kava extracts; the nanoemulsion carries only minimal kava-characteristic taste.',
    'Regulatory status for kava differs substantially between markets and has changed over time. Market authorisation and labelling are the brand\'s responsibility and require their own regulatory counsel.',
  ],
};

export const mushroomFormulation = {
  title: 'Functional mushrooms — formulation background',
  facts: [
    "Lion's Mane is Hericium erinaceus. Marker compounds discussed in the trade are hericenones (fruiting body) and erinacines (mycelium). It has a mild, slightly seafood-like or nutty sensory profile that is comparatively easy to mask.",
    'Reishi is Ganoderma lucidum. Its triterpene fraction carries a pronounced and persistent bitterness, which makes it the most challenging of the three to build a palatable beverage around.',
    'Cordyceps in commerce is usually Cordyceps militaris, which is cultivated; wild Ophiocordyceps sinensis is rare and expensive. Cordycepin is the commonly cited marker compound.',
    'Beta-glucan content is the meaningful specification for mushroom extracts. High alpha-glucan or starch relative to beta-glucan usually indicates grain substrate carryover rather than fruiting-body material.',
    'Fruiting body versus mycelium-on-grain is the central sourcing question in this category and materially changes the composition of what is supplied.',
    'Hot-water extraction targets the polysaccharide fraction. Dual extraction adds an alcohol step to capture triterpenes and other non-water-soluble constituents.',
    'Mushroom extracts are typically supplied as powders that disperse imperfectly in water, tending to sediment, raft on the surface, or leave a gritty mouthfeel. Nanoemulsification addresses the dispersion and uniformity problem.',
    'Standard quality documentation includes species identity, extraction ratio, beta-glucan assay, heavy metals, and microbial testing.',
  ],
};

export const domainKnowledge = [emulsionScience, beverageProcess, kavaBotany, mushroomFormulation];
