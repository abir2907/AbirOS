import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from 'd3-force';
import { Loader2, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildGraph, getGraph, type GraphData } from '@/lib/api';

const W = 760;
const H = 480;
const TYPE_COLORS: Record<string, string> = {
  concept: 'hsl(243 80% 67%)',
  technology: 'hsl(160 70% 45%)',
  project: 'hsl(35 90% 55%)',
  person: 'hsl(330 75% 60%)',
};
const colorFor = (type: string) => TYPE_COLORS[type] ?? 'hsl(240 5% 55%)';

type SimNode = GraphData['nodes'][number] & SimulationNodeDatum;

function layout(data: GraphData) {
  const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = data.edges
    .filter((e) => byId.has(e.source) && byId.has(e.target))
    .map((e) => ({ source: e.source, target: e.target }));

  const sim = forceSimulation(nodes)
    .force('link', forceLink(links).id((d: SimulationNodeDatum & { id?: string }) => d.id!).distance(70))
    .force('charge', forceManyBody().strength(-160))
    .force('center', forceCenter(W / 2, H / 2))
    .force('collide', forceCollide(22))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();

  // Normalize to the viewBox with padding.
  const xs = nodes.map((n) => n.x ?? 0);
  const ys = nodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 40;
  const sx = (maxX - minX || 1);
  const sy = (maxY - minY || 1);
  for (const n of nodes) {
    n.x = pad + ((n.x! - minX) / sx) * (W - 2 * pad);
    n.y = pad + ((n.y! - minY) / sy) * (H - 2 * pad);
  }
  return { nodes, links: data.edges.filter((e) => byId.has(e.source) && byId.has(e.target)) };
}

export function KnowledgeMap() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['graph'], queryFn: getGraph, retry: false });
  const build = useMutation({
    mutationFn: buildGraph,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['graph'] }),
  });

  const positioned = useMemo(
    () => (data && data.nodes.length > 0 ? layout(data) : null),
    [data],
  );
  const maxMentions = Math.max(1, ...(data?.nodes.map((n) => n.mentions) ?? [1]));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Entities and relationships extracted from your sources.
        </p>
        <Button variant="secondary" onClick={() => build.mutate()} disabled={build.isPending}>
          {build.isPending ? <Loader2 className="size-4 animate-spin" /> : <Network className="size-4" />}
          Build map
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !positioned ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No map yet. Ingest some sources, then click <b>Build map</b> to extract entities.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card/30">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
            {positioned.links.map((e, i) => {
              const a = positioned.nodes.find((n) => n.id === e.source)!;
              const b = positioned.nodes.find((n) => n.id === e.target)!;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="hsl(240 5% 30%)"
                  strokeWidth={Math.min(3, e.weight)}
                  strokeOpacity={0.5}
                />
              );
            })}
            {positioned.nodes.map((n) => {
              const r = 5 + (n.mentions / maxMentions) * 12;
              return (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r={r} fill={colorFor(n.type)} fillOpacity={0.85} />
                  <text
                    x={n.x}
                    y={(n.y ?? 0) - r - 3}
                    textAnchor="middle"
                    className="fill-foreground"
                    style={{ fontSize: 10 }}
                  >
                    {n.name.length > 22 ? `${n.name.slice(0, 22)}…` : n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
