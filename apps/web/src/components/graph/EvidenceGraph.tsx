// MIRROR – React Flow Knowledge Graph Component
// Renders inspections, evidence items, and intelligence records as an interactive graph.

import { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type {
  InspectionRecord,
  EvidenceItem,
  IntelligenceRecord,
} from '@mirror/core';

interface Props {
  inspections: InspectionRecord[];
  evidenceItems: EvidenceItem[];
  intelligence: IntelligenceRecord[];
}

// ── Custom Node Components ─────────────────────────────────────────────────

interface CustomNodeData {
  label: string;
}

function InspectionNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-3.5 py-2.5 rounded-lg border border-blue-500/50 bg-blue-950/90 text-blue-100 shadow-md text-xs whitespace-pre-line font-medium min-w-[180px] max-w-[240px] text-center">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-blue-400" />
      <div className="font-semibold text-blue-300 uppercase text-[10px] tracking-wider mb-1">
        Inspection
      </div>
      <div className="text-mirror-text font-mono text-[11px] leading-tight">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-blue-400" />
    </div>
  );
}

function EvidenceNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-3.5 py-2.5 rounded-lg border border-slate-500/50 bg-slate-800/90 text-slate-100 shadow-md text-xs whitespace-pre-line font-medium min-w-[180px] max-w-[240px] text-center">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-400" />
      <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mb-1">
        Evidence
      </div>
      <div className="text-mirror-text text-[11px] leading-tight truncate">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-400" />
    </div>
  );
}

function IntelligenceNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-3.5 py-2.5 rounded-lg border border-violet-500/50 bg-violet-950/90 text-violet-100 shadow-md text-xs whitespace-pre-line font-medium min-w-[180px] max-w-[240px] text-center">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-violet-400" />
      <div className="font-semibold text-violet-300 uppercase text-[10px] tracking-wider mb-1">
        Intelligence
      </div>
      <div className="text-mirror-text text-[11px] leading-tight">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-violet-400" />
    </div>
  );
}

// ── Graph Builder ──────────────────────────────────────────────────────────

function buildGraphElements(
  inspections: InspectionRecord[],
  evidenceItems: EvidenceItem[],
  intelligence: IntelligenceRecord[]
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];
  const nodeIds = new Set<string>();

  // 1. Top row: Inspections (y = 50)
  inspections.forEach((ins, idx) => {
    const label = `${ins.assetId}\n${ins.locationLabel}`;
    nodes.push({
      id: ins.id,
      type: 'inspection',
      position: { x: idx * 220, y: 50 },
      data: { label },
      style: { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' },
    });
    nodeIds.add(ins.id);
  });

  // 2. Middle row: Evidence items (y = 220)
  evidenceItems.forEach((evi, idx) => {
    const label = evi.filename || evi.type;
    nodes.push({
      id: evi.id,
      type: 'evidence',
      position: { x: idx * 220, y: 220 },
      data: { label },
      style: { backgroundColor: '#1e293b', borderColor: '#64748b' },
    });
    nodeIds.add(evi.id);

    // Edge: inspection -> evidence
    if (evi.inspectionId && nodeIds.has(evi.inspectionId)) {
      edges.push({
        id: `e-insp-evi-${evi.inspectionId}-${evi.id}`,
        source: evi.inspectionId,
        target: evi.id,
        animated: true,
        style: { stroke: '#64748b' },
      });
    }
  });

  // 3. Bottom row: Intelligence records (y = 390)
  intelligence.forEach((rec, idx) => {
    const pct = Math.round(rec.confidence * 100);
    const label = `${rec.content.kind}\n${pct}% confidence`;
    nodes.push({
      id: rec.id,
      type: 'intelligence',
      position: { x: idx * 220, y: 390 },
      data: { label },
      style: { backgroundColor: '#4c1d95', borderColor: '#8b5cf6' },
    });
    nodeIds.add(rec.id);

    // Edges: inspection -> intelligence
    if (rec.content.kind === 'cross-inspection-assessment') {
      const targetInspectionIds = rec.content.inspectionIds || [];
      if (targetInspectionIds.length > 0) {
        targetInspectionIds.forEach((inspId) => {
          if (nodeIds.has(inspId)) {
            edges.push({
              id: `e-insp-intel-${inspId}-${rec.id}`,
              source: inspId,
              target: rec.id,
              animated: true,
              style: { stroke: '#8b5cf6' },
            });
          }
        });
      } else if (rec.inspectionId && nodeIds.has(rec.inspectionId)) {
        edges.push({
          id: `e-insp-intel-${rec.inspectionId}-${rec.id}`,
          source: rec.inspectionId,
          target: rec.id,
          animated: true,
          style: { stroke: '#8b5cf6' },
        });
      }
    } else if (rec.inspectionId && nodeIds.has(rec.inspectionId)) {
      edges.push({
        id: `e-insp-intel-${rec.inspectionId}-${rec.id}`,
        source: rec.inspectionId,
        target: rec.id,
        animated: true,
        style: { stroke: '#8b5cf6' },
      });
    }
  });

  return { nodes, edges };
}

// ── Main Component ─────────────────────────────────────────────────────────

export function EvidenceGraph({
  inspections,
  evidenceItems,
  intelligence,
}: Props) {
  const nodeTypes = useMemo(
    () => ({
      inspection: InspectionNode,
      evidence: EvidenceNode,
      intelligence: IntelligenceNode,
    }),
    []
  );

  const initial = useMemo(
    () => buildGraphElements(inspections, evidenceItems, intelligence),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>(
    initial.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    const updated = buildGraphElements(inspections, evidenceItems, intelligence);
    setNodes(updated.nodes);
    setEdges(updated.edges);
  }, [inspections, evidenceItems, intelligence, setNodes, setEdges]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={true}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="!bg-mirror-surface !border-mirror-border !text-mirror-text !shadow-lg" />
        <MiniMap
          className="!bg-mirror-surface !border-mirror-border !shadow-lg"
          nodeColor={(node) => {
            if (node.type === 'inspection') return '#3b82f6';
            if (node.type === 'evidence') return '#64748b';
            if (node.type === 'intelligence') return '#8b5cf6';
            return '#475569';
          }}
        />
      </ReactFlow>
    </div>
  );
}
