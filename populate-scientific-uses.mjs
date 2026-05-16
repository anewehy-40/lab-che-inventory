import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

// Scientific/research recommendations for all 43 chemicals
const scientificUses = {
  "Sucrose": "Widely used as a carbon source in microbial growth media and fermentation studies. Used in density gradient centrifugation (sucrose gradients) for separating cellular organelles and macromolecules. Applied in cryoprotection of biological samples and in osmotic stress experiments on plant and microbial cells.",

  "D-Glucose anhydrous": "Primary carbon and energy source in cell culture media and microbial fermentation. Essential for studying glycolysis, cellular respiration, and metabolic pathways. Used in enzyme activity assays (glucose oxidase, hexokinase) and as a standard in colorimetric sugar quantification methods (DNS, phenol-sulfuric acid assay).",

  "Ferrous sulfate heptahydrate": "Key iron source in plant nutrient solutions (Hoagland's solution) and microbial growth media. Used in Fenton reaction studies for generating reactive oxygen species (ROS). Applied in iron bioavailability and uptake research, and as a reducing agent in antioxidant capacity assays (FRAP assay).",

  "Yeast extract": "Rich source of amino acids, vitamins, and growth factors for cultivating bacteria and fungi. Commonly used in general-purpose media (nutrient broth, LB broth). Applied in fermentation optimization studies and as a nitrogen source in industrial biotechnology research.",

  "Nutrient agar": "Standard solid growth medium for isolation, enumeration, and maintenance of non-fastidious bacteria. Used in antimicrobial susceptibility testing (disk diffusion method), colony morphology studies, and environmental microbiology sampling.",

  "MacConkey agar": "Selective and differential medium for isolating Gram-negative enteric bacteria. Differentiates lactose fermenters (e.g., E. coli — pink colonies) from non-fermenters (e.g., Salmonella — colorless). Widely used in food safety, water quality testing, and clinical microbiology.",

  "Brilliant green bile broth": "Selective enrichment broth for detecting and confirming coliform bacteria, particularly in water and food safety testing. Used in the presumptive and confirmatory stages of the multiple-tube fermentation technique for total coliform enumeration.",

  "Gallic acid": "Model phenolic compound for studying antioxidant activity using DPPH, ABTS, and FRAP assays. Used as a standard in the Folin-Ciocalteu total phenolic content assay. Investigated for antimicrobial, anti-inflammatory, and anticancer properties in pharmacological research.",

  "Copper sulfate pentahydrate": "Used in Biuret and Bradford protein quantification assays. Applied in Benedict's test for reducing sugars. Used as a fungicide in plant pathology research and as a catalyst in organic synthesis. Essential micronutrient source in plant and algal culture media.",

  "Phenol": "Used in phenol-chloroform DNA/RNA extraction (Chomczynski method) — a foundational technique in molecular biology. Applied in protein precipitation and as a disinfectant standard in antimicrobial studies. Used in colorimetric carbohydrate assays (phenol-sulfuric acid method).",

  "Iodine": "Used in starch detection assays and iodometric titrations. Applied in Gram staining as a mordant to fix crystal violet in bacterial cell walls. Used in thyroid research and iodine supplementation studies. Applied in antiseptic efficacy testing.",

  "Potassium iodide": "Used with iodine to prepare Lugol's solution for starch detection and Gram staining. Applied in iodometric titrations for oxidant quantification. Used in thyroid function research and as a potassium source in electrolyte studies.",

  "Aluminium chloride hexahydrate": "Used as a Lewis acid catalyst in organic synthesis reactions. Applied in flavonoid detection assays (AlCl₃ colorimetric method for flavonoid quantification). Used in antiperspirant efficacy studies and in coagulation/flocculation experiments in water treatment research.",

  "Tannic acid": "Used as a standard and reference compound in polyphenol research. Applied in protein precipitation and tannin-protein interaction studies. Used in antimicrobial and antiviral research. Applied in histological staining protocols and as a mordant in electron microscopy sample preparation.",

  "Sodium chloride": "Universal component of physiological saline solutions (0.9% NaCl) for cell and tissue studies. Used in buffer preparation (PBS, TBE, TAE). Applied in osmotic stress experiments and salt tolerance studies in plants and microorganisms. Essential in DNA/RNA precipitation protocols.",

  "Sodium bicarbonate": "Used as a pH buffer in cell culture media (CO₂/bicarbonate buffering system). Applied in acid-base balance studies and carbonate system research. Used in baking and food science experiments as a leavening agent model. Applied in carbon dioxide capture and sequestration research.",

  "Sodium carbonate": "Used in alkaline buffer preparation and pH adjustment in analytical chemistry. Applied in total alkalinity measurements in water quality analysis. Used in colorimetric assays requiring alkaline conditions (Folin-Ciocalteu reagent activation). Applied in glass and ceramic synthesis research.",

  "Sodium hydroxide pellets": "Essential reagent for pH adjustment and preparation of alkaline solutions in biochemical assays. Used in saponification reactions and lipid hydrolysis studies. Applied in protein denaturation experiments and in NaOH-based DNA extraction methods. Used in titration experiments for acid-base chemistry.",

  "Calcium nitrate tetrahydrate": "Primary calcium and nitrogen source in hydroponic and plant tissue culture nutrient solutions (Hoagland's, MS medium). Used in studies of calcium signaling in plant physiology. Applied in soil amendment research and in concrete chemistry studies.",

  "Ferric chloride anhydrous": "Used as a Lewis acid catalyst in Friedel-Crafts reactions. Applied in phenol and phenolic compound detection (FeCl₃ colorimetric test). Used in iron(III) reduction assays for studying microbial iron metabolism. Applied in coagulation studies for water treatment research.",

  "Vanillin": "Used as a reference standard in phenolic compound analysis by HPLC. Applied in the vanillin-HCl assay for quantifying condensed tannins (proanthocyanidins). Used in flavor chemistry and food science research. Investigated for antimicrobial and antioxidant properties.",

  "Tris HCl": "Fundamental component of biological buffers (Tris-HCl buffer, pH 7–9) used in DNA/RNA extraction, protein purification, and enzyme assays. Essential in gel electrophoresis running buffers (TAE, TBE, TGS). Used in Western blotting and ELISA protocols.",

  "Calcium chloride dihydrate": "Used in competent cell preparation for bacterial transformation (heat-shock method). Applied as a calcium source in cell culture and plant tissue culture media. Used in alginate bead preparation for cell encapsulation research. Applied in coagulation and precipitation studies.",

  "Sodium sulfate": "Used as a drying agent in organic solvent extraction procedures. Applied in sulfate reduction studies in environmental microbiology. Used in ion chromatography as a mobile phase additive. Applied in glass manufacturing and detergent research.",

  "Potassium sulfate": "Used as a potassium and sulfur source in plant nutrient solutions. Applied in soil fertility and plant nutrition research. Used in preparation of alum (potassium aluminum sulfate) for water purification studies. Applied as a flux in ceramic and glass research.",

  "Sodium nitrate": "Used as a nitrogen source in algal and plant culture media. Applied in denitrification and nitrogen cycle studies in environmental microbiology. Used in nitrate reduction assays for identifying bacterial species. Applied in food preservation research as a curing agent model.",

  "Silver sulfate": "Used as a catalyst in Chemical Oxygen Demand (COD) digestion for water quality analysis. Applied in antimicrobial silver ion release studies. Used in gravimetric analysis for sulfate determination. Applied in photocatalysis research.",

  "Dipotassium phosphate": "Key component of phosphate-buffered saline (PBS) and other biological buffers. Used as a phosphorus and potassium source in microbial and plant culture media. Applied in buffer capacity studies and enzyme activity assays requiring phosphate buffers.",

  "Silver nitrate": "Used in Mohr's method for chloride determination by argentometric titration. Applied in silver staining of proteins and nucleic acids in gels. Used in antimicrobial silver nanoparticle synthesis research. Applied in histological staining (Fontana-Masson stain) and in photographic chemistry studies.",

  "Cellulose": "Used as a model substrate for studying cellulase enzyme activity and lignocellulosic biomass degradation. Applied in paper and fiber research. Used in thin-layer chromatography (TLC) as a stationary phase. Applied in biodegradable packaging and biomaterial research.",

  "Gelatin": "Used as a gelling agent in microbiological media (gelatin liquefaction test for bacterial identification). Applied in cell culture as a coating substrate for cell adhesion studies. Used in drug delivery and encapsulation research. Applied in food science and texture analysis experiments.",

  "Chitosan": "Investigated extensively for antimicrobial activity against bacteria and fungi. Used in drug delivery, wound healing, and tissue engineering research due to its biocompatibility. Applied in nanoparticle synthesis for gene delivery. Used in food preservation and edible coating research.",

  "Ferrozine": "Highly specific chromogenic chelator for Fe²⁺ (ferrous iron) detection. Used in the ferrozine assay for quantifying dissolved iron in water, soil extracts, and biological samples. Applied in iron reduction and cycling studies in environmental and geochemical research.",

  "DPPH": "Standard free radical used in antioxidant capacity assays (DPPH radical scavenging assay). Applied to evaluate antioxidant activity of plant extracts, food products, and pure compounds. Used as a reference in comparative antioxidant studies alongside ABTS and FRAP methods.",

  "Gold(III) chloride": "Used as a precursor for gold nanoparticle (AuNP) synthesis via chemical reduction (e.g., citrate reduction method — Turkevich method). Applied in nanotechnology research for biosensors, drug delivery, and surface-enhanced Raman spectroscopy (SERS). Used in gold staining for electron microscopy.",

  "Methanol": "Universal solvent for plant secondary metabolite extraction (polyphenols, flavonoids, alkaloids). Used as a mobile phase in HPLC and LC-MS analysis. Applied in transesterification reactions for biodiesel production research. Used in protein precipitation for proteomics sample preparation.",

  "Acetonitrile": "Primary HPLC and LC-MS mobile phase solvent for reversed-phase chromatography. Used in DNA/RNA oligonucleotide synthesis and purification. Applied in protein precipitation for metabolomics and proteomics sample preparation. Used in solid-phase extraction (SPE) procedures.",

  "Chloroform": "Used in phenol-chloroform nucleic acid extraction (TRIzol/TRI reagent method). Applied as a solvent for lipid extraction (Bligh-Dyer and Folch methods). Used in NMR spectroscopy as a deuterated solvent (CDCl₃). Applied in polymer dissolution and membrane research.",

  "Acetic acid": "Used in buffer preparation (acetate buffer, pH 3.6–5.6) for enzyme assays and electrophoresis. Applied in protein staining and destaining solutions for SDS-PAGE gels. Used in plant tissue fixation (FAA fixative). Applied in HPLC mobile phase preparation for acidic compound analysis.",

  "Phenol solution": "Used in phenol-chloroform RNA and DNA extraction protocols (TRIzol method). Applied in protein denaturation and removal during nucleic acid purification. Used in colorimetric carbohydrate quantification (phenol-sulfuric acid assay). Applied as a disinfectant standard in antimicrobial efficacy testing.",

  "Phosphate buffer solution A": "Used as a ready-made phosphate buffer for enzyme activity assays, protein stability studies, and biological sample preparation. Applied in ELISA, Western blot, and immunohistochemistry protocols requiring a stable pH environment.",

  "Phosphate buffer solution B": "Used as a monobasic phosphate buffer component for preparing phosphate-buffered saline (PBS) and other biological buffers. Applied in chromatography mobile phase preparation and in cell washing procedures during flow cytometry and microscopy.",

  "Hydrochloric acid": "Used for pH adjustment and preparation of acidic buffers in biochemical assays. Applied in protein hydrolysis for amino acid analysis. Used in mineral digestion of soil and plant samples for elemental analysis (ICP-OES/AAS). Applied in cleaning glassware and removing metal contaminants in trace metal studies.",
};

async function populate() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("Populating scientific uses for all chemicals...");
  let updated = 0;

  for (const [name, uses] of Object.entries(scientificUses)) {
    const [result] = await connection.execute(
      "UPDATE chemicals SET scientificUses = ? WHERE name = ?",
      [uses, name]
    );
    if (result.affectedRows > 0) {
      updated++;
      console.log(`✓ ${name}`);
    } else {
      console.warn(`⚠ Not found: ${name}`);
    }
  }

  console.log(`\nDone! Updated ${updated}/${Object.keys(scientificUses).length} chemicals.`);
  await connection.end();
}

populate().catch(err => { console.error("Failed:", err); process.exit(1); });
