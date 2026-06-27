/**
 * Pure, deterministic analysis of a spoken/written interview answer's *delivery*
 * (the LLM judges relevance separately). Counts filler words, hedging phrases,
 * and length, and derives a 0–100 delivery score. Unit-tested.
 */
const FILLERS = ['um', 'uh', 'er', 'like', 'you know', 'basically', 'actually', 'literally', 'i mean'];
const HEDGES = ['maybe', 'i think', 'probably', 'i guess', 'perhaps', 'possibly', 'sort of', 'kind of'];

function countOccurrences(haystack: string, needle: string): number {
  if (needle.includes(' ')) {
    // Phrase: count substring occurrences.
    let count = 0;
    let idx = haystack.indexOf(needle);
    while (idx !== -1) {
      count++;
      idx = haystack.indexOf(needle, idx + needle.length);
    }
    return count;
  }
  // Single word: word-boundary match.
  const m = haystack.match(new RegExp(`\\b${needle}\\b`, 'g'));
  return m ? m.length : 0;
}

export interface DeliveryAnalysis {
  wordCount: number;
  fillerCount: number;
  hedgeCount: number;
  fillerRate: number;
  deliveryScore: number; // 0..100
}

export function analyzeDelivery(answer: string): DeliveryAnalysis {
  const lower = ` ${answer.toLowerCase()} `;
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const fillerCount = FILLERS.reduce((sum, f) => sum + countOccurrences(lower, f), 0);
  const hedgeCount = HEDGES.reduce((sum, h) => sum + countOccurrences(lower, h), 0);
  const fillerRate = wordCount ? fillerCount / wordCount : 0;

  // Penalize fillers heavily, hedging mildly; reward answers that aren't trivially short.
  let score = 100 - fillerRate * 250 - hedgeCount * 4;
  if (wordCount < 20) score -= (20 - wordCount) * 1.5; // too short to be a strong answer
  const deliveryScore = Math.max(0, Math.min(100, Math.round(score)));

  return { wordCount, fillerCount, hedgeCount, fillerRate: Number(fillerRate.toFixed(3)), deliveryScore };
}
