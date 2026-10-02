import type { CanvasNode } from './useDataSourceCanvas';

/**
 * Prototype of agent update feedback: the agent "updates" one entity or join
 * card, and the canvas highlights it. Pure helpers so the pick stays predictable.
 */

export interface CanvasUpdateTarget {
  nodeId: string;
  /** How the agent refers to the card, e.g. "the join between Orders and Customers". */
  label: string;
}

function cardName(node: CanvasNode): string {
  return node.customName?.trim() || node.label;
}

/** Table names feeding a node, left to right through nested joins. */
function tablesUnder(nodes: CanvasNode[], node: CanvasNode): string[] {
  if (node.type === 'table') return [cardName(node)];
  return (node.inputs ?? []).flatMap((id) => {
    const input = nodes.find((item) => item.id === id);
    return input ? tablesUnder(nodes, input) : [];
  });
}

function joinedList(names: string[]): string {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function describeCanvasCard(nodes: CanvasNode[], node: CanvasNode): string {
  if (node.type === 'table') return `the ${cardName(node)} entity`;
  if (node.customName?.trim()) return `the ${node.customName.trim()} join`;
  const tables = tablesUnder(nodes, node);
  if (tables.length === 2) return `the join between ${tables[0]} and ${tables[1]}`;
  return tables.length ? `the join of ${joinedList(tables)}` : 'a join';
}

/** Joins first, then entities; `turn` rotates so repeated updates touch different cards. */
export function pickUpdateTarget(nodes: CanvasNode[], turn: number): CanvasUpdateTarget | null {
  const joins = nodes.filter((node) => node.type === 'join');
  const tables = nodes.filter((node) => node.type === 'table');
  const candidates = [...joins, ...tables];
  if (!candidates.length) return null;
  const node = candidates[turn % candidates.length];
  return { nodeId: node.id, label: describeCanvasCard(nodes, node) };
}
