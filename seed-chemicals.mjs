import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const chemicals = [
  // Powders & Solids
  { name: "Sucrose", formula: "C₁₂H₂₂O₁₁", molecularWeight: "342.30", category: "Carbohydrate", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "D-Glucose anhydrous", formula: "C₆H₁₂O₆", molecularWeight: "180.16", category: "Carbohydrate", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Ferrous sulfate heptahydrate", formula: "FeSO₄·7H₂O", molecularWeight: "278.01", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS07, GHS09", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "Oxidising; keep dry" },
  { name: "Yeast extract", formula: "—", molecularWeight: "—", category: "Biological medium", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Nutrient agar", formula: "—", molecularWeight: "—", category: "Microbiological", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "MacConkey agar", formula: "—", molecularWeight: "—", category: "Microbiological", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Brilliant green bile broth", formula: "—", molecularWeight: "—", category: "Microbiological", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Gallic acid", formula: "C₇H₆O₅", molecularWeight: "170.12", category: "Phenolic acid", hazardLevel: "Hazardous", ghsCodes: "GHS07", storageConditions: "RT, dark", physicalState: "Powder/Solid", notes: "Irritant" },
  { name: "Copper sulfate pentahydrate", formula: "CuSO₄·5H₂O", molecularWeight: "249.69", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS07, GHS09", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "Toxic to aquatic life" },
  { name: "Phenol", formula: "C₆H₅OH", molecularWeight: "94.11", category: "Aromatic compound", hazardLevel: "High Hazard", ghsCodes: "GHS06, GHS08", storageConditions: "Locked cabinet", physicalState: "Powder/Solid", notes: "Corrosive, toxic; fume hood" },
  { name: "Iodine", formula: "I₂", molecularWeight: "253.81", category: "Halogen", hazardLevel: "Hazardous", ghsCodes: "GHS07, GHS09", storageConditions: "RT, dark, sealed", physicalState: "Powder/Solid", notes: "Oxidiser; avoid skin contact" },
  { name: "Potassium iodide", formula: "KI", molecularWeight: "166.00", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS07", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Aluminium chloride hexahydrate", formula: "AlCl₃·6H₂O", molecularWeight: "241.43", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS07", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "Hygroscopic" },
  { name: "Tannic acid", formula: "—", molecularWeight: "—", category: "Polyphenol", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Sodium chloride", formula: "NaCl", molecularWeight: "58.44", category: "Inorganic salt", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Sodium bicarbonate", formula: "NaHCO₃", molecularWeight: "84.01", category: "Inorganic salt", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Sodium carbonate", formula: "Na₂CO₃", molecularWeight: "105.99", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS07", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "Irritant" },
  { name: "Sodium hydroxide pellets", formula: "NaOH", molecularWeight: "40.00", category: "Strong base", hazardLevel: "High Hazard", ghsCodes: "GHS05, GHS07", storageConditions: "Locked cabinet", physicalState: "Powder/Solid", notes: "Corrosive; absorbs CO₂" },
  { name: "Calcium nitrate tetrahydrate", formula: "Ca(NO₃)₂·4H₂O", molecularWeight: "236.15", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS03, GHS07", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "Oxidiser" },
  { name: "Ferric chloride anhydrous", formula: "FeCl₃", molecularWeight: "162.20", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS07", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "Hygroscopic; corrosive" },
  { name: "Vanillin", formula: "C₈H₈O₃", molecularWeight: "152.15", category: "Aromatic aldehyde", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dark", physicalState: "Powder/Solid", notes: "" },
  { name: "Tris HCl", formula: "C₄H₁₁NO₃·HCl", molecularWeight: "157.60", category: "Buffer component", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Calcium chloride dihydrate", formula: "CaCl₂·2H₂O", molecularWeight: "147.01", category: "Inorganic salt", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "Hygroscopic" },
  { name: "Sodium sulfate", formula: "Na₂SO₄", molecularWeight: "142.04", category: "Inorganic salt", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Potassium sulfate", formula: "K₂SO₄", molecularWeight: "174.26", category: "Inorganic salt", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Sodium nitrate", formula: "NaNO₃", molecularWeight: "84.99", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS03, GHS07", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "Oxidiser" },
  { name: "Silver sulfate", formula: "Ag₂SO₄", molecularWeight: "311.80", category: "Inorganic salt", hazardLevel: "Hazardous", ghsCodes: "GHS07, GHS09", storageConditions: "Dark, locked", physicalState: "Powder/Solid", notes: "Light-sensitive; toxic" },
  { name: "Dipotassium phosphate", formula: "K₂HPO₄", molecularWeight: "174.18", category: "Buffer component", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Silver nitrate", formula: "AgNO₃", molecularWeight: "169.87", category: "Inorganic salt", hazardLevel: "High Hazard", ghsCodes: "GHS03, GHS05", storageConditions: "Dark, locked", physicalState: "Powder/Solid", notes: "Oxidiser; stains skin" },
  { name: "Cellulose", formula: "(C₆H₁₀O₅)n", molecularWeight: "—", category: "Polysaccharide", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Gelatin", formula: "—", molecularWeight: "—", category: "Protein", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Chitosan", formula: "(C₆H₁₁NO₄)n", molecularWeight: "—", category: "Polysaccharide", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "RT, dry", physicalState: "Powder/Solid", notes: "" },
  { name: "Ferrozine", formula: "C₂₀H₁₃N₄NaO₆S₂", molecularWeight: "492.46", category: "Chelating agent", hazardLevel: "Hazardous", ghsCodes: "GHS07", storageConditions: "RT, dark", physicalState: "Powder/Solid", notes: "" },
  { name: "DPPH", formula: "C₁₈H₁₂N₅O₆", molecularWeight: "394.32", category: "Radical scavenger", hazardLevel: "Hazardous", ghsCodes: "GHS07", storageConditions: "RT, dark, sealed", physicalState: "Powder/Solid", notes: "Light-sensitive" },
  { name: "Gold(III) chloride", formula: "AuCl₃", molecularWeight: "303.33", category: "Precious metal salt", hazardLevel: "High Hazard", ghsCodes: "GHS05, GHS07", storageConditions: "Locked cabinet", physicalState: "Powder/Solid", notes: "Corrosive; very expensive" },
  // Liquids
  { name: "Methanol", formula: "CH₃OH", molecularWeight: "32.04", category: "Solvent", hazardLevel: "High Hazard", ghsCodes: "GHS02, GHS06, GHS08", storageConditions: "Flammable cabinet", physicalState: "Liquid", notes: "Toxic; flammable; fume hood" },
  { name: "Acetonitrile", formula: "CH₃CN", molecularWeight: "41.05", category: "Solvent", hazardLevel: "High Hazard", ghsCodes: "GHS02, GHS07", storageConditions: "Flammable cabinet", physicalState: "Liquid", notes: "Flammable; irritant; fume hood" },
  { name: "Chloroform", formula: "CHCl₃", molecularWeight: "119.38", category: "Solvent", hazardLevel: "High Hazard", ghsCodes: "GHS06, GHS08", storageConditions: "Locked cabinet", physicalState: "Liquid", notes: "Suspected carcinogen; fume hood" },
  { name: "Acetic acid", formula: "CH₃COOH", molecularWeight: "60.05", category: "Organic acid", hazardLevel: "Hazardous", ghsCodes: "GHS02, GHS05", storageConditions: "Acid cabinet", physicalState: "Liquid", notes: "Corrosive; flammable" },
  { name: "Phenol solution", formula: "C₆H₅OH (aq)", molecularWeight: "—", category: "Aromatic compound", hazardLevel: "High Hazard", ghsCodes: "GHS06, GHS08", storageConditions: "Locked cabinet", physicalState: "Liquid", notes: "Corrosive; toxic; fume hood" },
  { name: "Phosphate buffer solution A", formula: "—", molecularWeight: "—", category: "Buffer", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "4°C fridge", physicalState: "Liquid", notes: "" },
  { name: "Phosphate buffer solution B", formula: "NaH₂PO₄ (aq)", molecularWeight: "—", category: "Buffer", hazardLevel: "Normal", ghsCodes: "None", storageConditions: "4°C fridge", physicalState: "Liquid", notes: "" },
  { name: "Hydrochloric acid", formula: "HCl", molecularWeight: "36.46", category: "Strong acid", hazardLevel: "High Hazard", ghsCodes: "GHS05, GHS07", storageConditions: "Acid cabinet", physicalState: "Liquid", notes: "Corrosive; fuming; fume hood required" },
];

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  // Check if already seeded
  const [rows] = await connection.execute("SELECT COUNT(*) as count FROM chemicals");
  const count = rows[0].count;
  if (count > 0) {
    console.log(`Database already has ${count} chemicals. Skipping seed.`);
    await connection.end();
    return;
  }

  console.log(`Seeding ${chemicals.length} chemicals...`);
  for (const chem of chemicals) {
    await connection.execute(
      `INSERT INTO chemicals (name, formula, molecularWeight, category, hazardLevel, ghsCodes, storageConditions, physicalState, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [chem.name, chem.formula, chem.molecularWeight, chem.category, chem.hazardLevel, chem.ghsCodes, chem.storageConditions, chem.physicalState, chem.notes]
    );
  }
  console.log(`✓ Seeded ${chemicals.length} chemicals successfully.`);
  await connection.end();
}

seed().catch(err => { console.error("Seed failed:", err); process.exit(1); });
