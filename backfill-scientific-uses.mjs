import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("No DATABASE_URL"); process.exit(1); }

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function invokeLLM(messages) {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${FORGE_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages }),
  });
  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

async function getScientificUses(name, formula, category) {
  const prompt = `You are a laboratory chemical expert. Write 2-4 sentences describing the main scientific and research applications of "${name}" (formula: ${formula || "unknown"}, category: ${category || "unknown"}) in a laboratory context. Be specific about research uses, assays, synthesis, or analytical methods it is commonly used in. Return plain text only, no bullet points.`;
  return invokeLLM([
    { role: "system", content: "You are a laboratory chemical expert providing concise scientific use descriptions." },
    { role: "user", content: prompt },
  ]);
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  // Get all chemicals missing scientificUses
  const [rows] = await conn.execute(
    "SELECT id, name, formula, category FROM chemicals WHERE scientificUses IS NULL OR scientificUses = ''"
  );
  
  console.log(`Found ${rows.length} chemicals missing scientific uses. Generating...`);
  
  let count = 0;
  for (const row of rows) {
    try {
      const uses = await getScientificUses(row.name, row.formula, row.category);
      await conn.execute("UPDATE chemicals SET scientificUses = ? WHERE id = ?", [uses, row.id]);
      count++;
      console.log(`[${count}/${rows.length}] ✓ ${row.name}`);
    } catch (err) {
      console.error(`✗ Failed for ${row.name}:`, err.message);
    }
  }
  
  await conn.end();
  console.log(`\nDone! Updated ${count} chemicals.`);
}

main().catch(console.error);
