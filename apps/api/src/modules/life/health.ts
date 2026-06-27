import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { getDb, getPool, document, biomarker, biomarkerReading } from '@abiros/db';
import { getLlm } from '../../lib/ai.js';
import { HttpError } from '../../lib/errors.js';

/** Pure: a reading is out of range if below the low or above the high reference. */
export function computeOutOfRange(value: number, low?: number | null, high?: number | null): boolean {
  if (low != null && value < low) return true;
  if (high != null && value > high) return true;
  return false;
}

const extractSchema = z.object({
  biomarkers: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.number(),
        unit: z.string().optional(),
        referenceLow: z.number().optional(),
        referenceHigh: z.number().optional(),
        takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .default([]),
});

/** Extract biomarkers from an ingested blood-test source's text (LLM structured extraction). */
export async function extractBiomarkers(sourceId: string) {
  const db = getDb();
  const [doc] = await db.select({ text: document.text }).from(document).where(eq(document.sourceId, sourceId)).limit(1);
  if (!doc) throw HttpError.validation('That source has no extracted text yet.');

  const res = await getLlm().chat({
    system: 'You extract lab biomarkers from a blood-test report. Use ONLY the report\'s own reference ranges. Reply with JSON only.',
    json: true,
    messages: [
      {
        role: 'user',
        content: `Extract each biomarker with its value, unit, and the report's printed reference low/high, plus the report date if present. JSON: {"biomarkers":[{"name":"Hemoglobin","value":13.5,"unit":"g/dL","referenceLow":13,"referenceHigh":17,"takenOn":"2026-01-01"}]}\n\n${doc.text.slice(0, 8000)}`,
      },
    ],
  });
  const parsed = extractSchema.parse(JSON.parse(res.content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()));

  let saved = 0;
  for (const b of parsed.biomarkers) {
    const normalizedName = b.name.trim().toLowerCase();
    const [bm] =
      (await db.select({ id: biomarker.id }).from(biomarker).where(eq(biomarker.normalizedName, normalizedName)).limit(1)) ?? [];
    const biomarkerId =
      bm?.id ??
      (await db.insert(biomarker).values({ name: b.name.trim(), normalizedName, unit: b.unit }).returning({ id: biomarker.id }))[0]?.id;
    if (!biomarkerId) continue;
    await db.insert(biomarkerReading).values({
      biomarkerId,
      value: b.value,
      unit: b.unit,
      referenceLow: b.referenceLow,
      referenceHigh: b.referenceHigh,
      takenOn: b.takenOn,
      sourceId,
      outOfRange: computeOutOfRange(b.value, b.referenceLow, b.referenceHigh),
    });
    saved++;
  }
  return { extracted: saved };
}

/** Biomarkers with their latest reading + flag. */
export async function listBiomarkers() {
  const { rows } = await getPool().query<{
    name: string;
    unit: string | null;
    value: number;
    reference_low: number | null;
    reference_high: number | null;
    out_of_range: boolean;
    taken_on: string | null;
  }>(
    `SELECT DISTINCT ON (b.id) b.name, b.unit, r.value, r.reference_low, r.reference_high, r.out_of_range, r.taken_on
       FROM biomarker b JOIN biomarker_reading r ON r.biomarker_id = b.id
      ORDER BY b.id, r.taken_on DESC NULLS LAST, r.created_at DESC`,
  );
  return rows;
}

export async function biomarkerSeries(name: string) {
  const db = getDb();
  const [b] = await db
    .select({ id: biomarker.id, name: biomarker.name, unit: biomarker.unit })
    .from(biomarker)
    .where(eq(biomarker.normalizedName, name.trim().toLowerCase()))
    .limit(1);
  if (!b) return undefined;
  const readings = await db
    .select({ value: biomarkerReading.value, takenOn: biomarkerReading.takenOn, outOfRange: biomarkerReading.outOfRange, low: biomarkerReading.referenceLow, high: biomarkerReading.referenceHigh })
    .from(biomarkerReading)
    .where(eq(biomarkerReading.biomarkerId, b.id))
    .orderBy(asc(biomarkerReading.takenOn));
  return { biomarker: b, readings };
}

export const HEALTH_DISCLAIMER =
  'This is a personal tracker, not medical advice or diagnosis. Values are shown against the reference range printed on your own report. Consult a doctor for interpretation.';
