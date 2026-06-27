import { z } from 'zod';
import { getLlm } from '../../lib/ai.js';

const graphSchema = z.object({
  entities: z
    .array(z.object({ name: z.string().min(1), type: z.string().default('concept') }))
    .default([]),
  relations: z
    .array(z.object({ from: z.string().min(1), to: z.string().min(1), type: z.string().default('relates_to') }))
    .default([]),
});

function parseJson(content: string): unknown {
  return JSON.parse(content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
}

/** Extract a small knowledge graph (entities + typed relations) from text. */
export async function extractGraph(text: string) {
  const res = await getLlm().chat({
    system: 'You extract knowledge graphs. Reply with JSON only.',
    json: true,
    messages: [
      {
        role: 'user',
        content: `From the content, extract the key entities (people, projects, concepts, technologies) and the relationships between them. Use relation types like relates_to, prerequisite_of, part_of, uses, authored_by. Respond as JSON: {"entities": [{"name": "...", "type": "concept"}], "relations": [{"from": "...", "to": "...", "type": "relates_to"}]}\n\n${text.slice(0, 6000)}`,
      },
    ],
  });
  return graphSchema.parse(parseJson(res.content));
}
