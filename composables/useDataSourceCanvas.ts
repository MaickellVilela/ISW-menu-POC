import { ref, computed, onMounted, watch, type Ref } from 'vue';
import { createHistory } from './useHistory';

export type CanvasNodeType = 'table' | 'join' | 'output';
export type JoinType = 'inner' | 'left' | 'full';

export interface FieldDef {
  name: string;
  type: string;
}

export interface SourceItem {
  key: string;
  label: string;
  description: string;
  fields: FieldDef[];
}

/** A selectable field in a join condition dropdown, qualified by its source entity. */
export interface FieldOption {
  /** Stored value, e.g. "Transactions.location_id". */
  value: string;
  name: string;
  type: string;
  entity: string;
}

export interface JoinCondition {
  id: string;
  leftField: string;
  rightField: string;
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  /** Stable technical name used to qualify fields in join conditions (never edited by the user). */
  label: string;
  /** User-facing display name. When unset, the UI falls back to `label` (or "Join"). */
  customName?: string;
  /** Per-card width in px. When unset, falls back to NODE_WIDTH. Clamped to [MIN,MAX]. */
  width?: number;
  x: number;
  y: number;
  /** Table nodes expose the columns that joins can match on. */
  fields?: FieldDef[];
  /** Join nodes: [leftId, rightId]. Output node: [sourceId]. */
  inputs?: string[];
  /** Join nodes only. */
  joinType?: JoinType;
  /** Join nodes only. */
  conditions?: JoinCondition[];
  /** Table nodes: when true the field list is hidden (header only). */
  collapsed?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export type ConnectionKind = 'left' | 'right' | 'output';

export interface Connection {
  id: string;
  from: Point;
  to: Point;
  kind: ConnectionKind;
}

export const NODE_WIDTH = 232;
/** Cards can be resized between 60% and 200% of the default width. */
export const MIN_NODE_WIDTH = Math.round(NODE_WIDTH * 0.6);
export const MAX_NODE_WIDTH = NODE_WIDTH * 2;

export function clampNodeWidth(width: number): number {
  return Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, Math.round(width)));
}

/** Vertical offsets (from a node's top) where connection ports are anchored. */
export const PORT_DY = 46;
export const JOIN_RIGHT_PORT_DY = 74;
/** The output (right-edge) port always sits on the header's vertical centre (h-9 = 36px). */
export const OUTPUT_PORT_DY = 18;
/** Collapsed join: the two input ports are stacked inside the header band. */
export const JOIN_COLLAPSED_LEFT_DY = 13;
export const JOIN_COLLAPSED_RIGHT_DY = 27;

/** MIME type used to carry a SourceItem across the native drag-and-drop boundary. */
export const SOURCE_DRAG_MIME = 'application/x-datasource-item';

export const JOIN_TYPE_LABELS: Record<JoinType, string> = {
  inner: 'Inner',
  left: 'Left',
  full: 'Full Outer',
};

const STORAGE_KEY = 'datasource-canvas-layout-v2';
const OUTPUT_NODE_ID = 'output-root';

/* -------------------------------------------------------------------------- */
/* Pure helpers (kept free of Vue state so they are easy to unit test)        */
/* -------------------------------------------------------------------------- */

let idSequence = 0;

export function createId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence}`;
}

export function createTableNode(item: SourceItem, x: number, y: number): CanvasNode {
  return {
    id: createId('table'),
    type: 'table',
    label: item.label,
    x,
    y,
    fields: item.fields.map((field) => ({ ...field })),
  };
}

export function createJoinNode(
  leftId: string,
  rightId: string,
  x: number,
  y: number,
  joinType: JoinType = 'inner',
): CanvasNode {
  return {
    id: createId('join'),
    type: 'join',
    label: 'Join',
    x,
    y,
    inputs: [leftId, rightId],
    joinType,
    conditions: [{ id: createId('cond'), leftField: '', rightField: '' }],
  };
}

export function createOutputNode(x: number, y: number): CanvasNode {
  return { id: OUTPUT_NODE_ID, type: 'output', label: 'Output', x, y, inputs: [] };
}

export function isOutputNode(node: CanvasNode): boolean {
  return node.type === 'output';
}

/** Effective, clamped width for a node (falls back to the default). */
export function nodeWidth(node: CanvasNode): number {
  return clampNodeWidth(node.width ?? NODE_WIDTH);
}

/** Output port (right edge) for any node that can feed downstream. Always centred on the header. */
export function outputAnchor(node: CanvasNode): Point {
  return { x: node.x + nodeWidth(node), y: node.y + OUTPUT_PORT_DY };
}

/** Input port (left edge). Slot 1 is the Right input of a join; everything else uses slot 0. */
export function inputAnchor(node: CanvasNode, slot = 0): Point {
  let dy = PORT_DY;
  if (node.type === 'join') {
    if (node.collapsed) dy = slot === 1 ? JOIN_COLLAPSED_RIGHT_DY : JOIN_COLLAPSED_LEFT_DY;
    else dy = slot === 1 ? JOIN_RIGHT_PORT_DY : PORT_DY;
  }
  return { x: node.x, y: node.y + dy };
}

/** Suggested spot for a new join node: to the right of, and between, its inputs. */
export function computeJoinPosition(a: CanvasNode, b: CanvasNode): Point {
  return {
    x: Math.max(a.x + nodeWidth(a), b.x + nodeWidth(b)) + 96,
    y: (a.y + b.y) / 2,
  };
}

/* -------------------------------------------------------------------------- */
/* Card sizing                                                                */
/*                                                                            */
/* Heights are derived from the model (collapsed flag + field/condition       */
/* counts), so nodeSize stays a pure function usable for layout math and unit  */
/* tests. The metrics below mirror CanvasNode.vue and are kept in one place so */
/* they can be tuned together if the card markup changes.                     */
/* -------------------------------------------------------------------------- */

/** Card header is `h-9` (36px) for every node type. */
export const HEADER_HEIGHT = 36;
const CARD_BORDER = 2;
const FIELD_ROW_HEIGHT = 20;
const FIELD_LIST_PADDING = 12;
const FIELD_LIST_MAX_HEIGHT = 176;
const JOIN_INPUTS_HEIGHT = 48;
const JOIN_CONDITIONS_CHROME = 56;
const CONDITION_ROW_HEIGHT = 34;
const OUTPUT_BODY_HEIGHT = 48;

export interface NodeSize {
  width: number;
  height: number;
}

/**
 * Estimates a card's rendered bounding box from the model alone.
 *
 * `activeFieldCount` covers the collapsed-table case that surfaces only the
 * fields referenced by joins; it defaults to 0 for callers that only have the
 * node (e.g. layout math that treats collapsed tables as header-only).
 */
export function nodeSize(node: CanvasNode, activeFieldCount = 0): NodeSize {
  const width = nodeWidth(node);

  if (node.type === 'output') {
    return { width, height: HEADER_HEIGHT + OUTPUT_BODY_HEIGHT };
  }

  if (node.type === 'table') {
    if (node.collapsed) {
      const body = activeFieldCount > 0 ? activeFieldCount * FIELD_ROW_HEIGHT + FIELD_LIST_PADDING : 0;
      return { width, height: HEADER_HEIGHT + body };
    }
    const fieldCount = node.fields?.length ?? 0;
    const listHeight =
      fieldCount > 0 ? Math.min(fieldCount * FIELD_ROW_HEIGHT + FIELD_LIST_PADDING, FIELD_LIST_MAX_HEIGHT) : 0;
    return { width, height: HEADER_HEIGHT + CARD_BORDER + listHeight };
  }

  // Join
  if (node.collapsed) {
    return { width, height: HEADER_HEIGHT };
  }
  const conditionCount = node.conditions?.length ?? 0;
  const height =
    HEADER_HEIGHT + CARD_BORDER + JOIN_INPUTS_HEIGHT + JOIN_CONDITIONS_CHROME + conditionCount * CONDITION_ROW_HEIGHT;
  return { width, height };
}

/* -------------------------------------------------------------------------- */
/* Auto layout (cascade)                                                      */
/*                                                                            */
/* Every join combines exactly two inputs, so the tidy layout stacks each     */
/* join's two inputs in the same column (left-aligned, one above the other)   */
/* and drops the join one column to the right, centred between them. Because   */
/* the running result feeds the next join, this naturally cascades down and to */
/* the right (see the reference mock): each new table sits below its sibling   */
/* result and its join steps right again.                                     */
/*                                                                            */
/* Columns come from the longest distance to the Output (so both inputs of a  */
/* join always share a column); vertical order comes from a left-first walk of */
/* the graph, giving source tables sequential rows in join order. Pure +      */
/* deterministic, so it stays easy to unit test.                              */
/* -------------------------------------------------------------------------- */

export interface LayoutOptions {
  originX?: number;
  originY?: number;
  /** Horizontal gap between columns. */
  columnGap?: number;
  /** Vertical gap between cards stacked in the same column. */
  rowGap?: number;
  /** Height source; defaults to nodeSize. Callers can inject collapsed-table sizes. */
  sizeOf?: (node: CanvasNode) => NodeSize;
}

/** Computes tidy cascade positions for every node without mutating them. */
export function computeLayout(nodes: CanvasNode[], options: LayoutOptions = {}): Map<string, Point> {
  const originX = options.originX ?? 80;
  const originY = options.originY ?? 60;
  const columnGap = options.columnGap ?? 48;
  const rowGap = options.rowGap ?? 16;
  const sizeOf = options.sizeOf ?? ((node: CanvasNode) => nodeSize(node));

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const heightOf = (id: string): number => sizeOf(byId.get(id)!).height;
  const inputsOf = (node: CanvasNode | undefined): string[] =>
    (node?.inputs ?? []).filter((inputId) => byId.has(inputId));

  // Who consumes each node (reverse of the inputs edges).
  const consumers = new Map<string, string[]>();
  for (const node of nodes) {
    for (const inputId of inputsOf(node)) {
      const list = consumers.get(inputId);
      if (list) list.push(node.id);
      else consumers.set(inputId, [node.id]);
    }
  }

  /* ------------------------------ columns -------------------------------- */

  // Distance to the Output along the longest downstream path. Undefined when a
  // node cannot reach the Output (orphan tables / partially-built chains).
  const output = nodes.find(isOutputNode);
  const outLevel = new Map<string, number>();
  if (output) outLevel.set(output.id, 0);

  function computeOutLevel(id: string, visiting: Set<string>): number | undefined {
    const cached = outLevel.get(id);
    if (cached !== undefined) return cached;
    let best: number | undefined;
    for (const consumerId of consumers.get(id) ?? []) {
      if (visiting.has(consumerId)) continue;
      visiting.add(consumerId);
      const level = computeOutLevel(consumerId, visiting);
      visiting.delete(consumerId);
      if (level !== undefined) best = best === undefined ? level + 1 : Math.max(best, level + 1);
    }
    if (best !== undefined) outLevel.set(id, best);
    return best;
  }
  for (const node of nodes) computeOutLevel(node.id, new Set([node.id]));

  const maxOutLevel = Math.max(0, ...outLevel.values());

  // Fallback for unreachable nodes: their longest distance from a source.
  const forwardDepth = new Map<string, number>();
  function computeForward(id: string, visiting: Set<string>): number {
    const cached = forwardDepth.get(id);
    if (cached !== undefined) return cached;
    let depth = 0;
    for (const inputId of inputsOf(byId.get(id))) {
      if (visiting.has(inputId)) continue;
      visiting.add(inputId);
      depth = Math.max(depth, computeForward(inputId, visiting) + 1);
      visiting.delete(inputId);
    }
    forwardDepth.set(id, depth);
    return depth;
  }

  const columnOf = new Map<string, number>();
  for (const node of nodes) {
    const level = outLevel.get(node.id);
    columnOf.set(node.id, level !== undefined ? maxOutLevel - level : computeForward(node.id, new Set([node.id])));
  }

  // Resolve each column's x from the widest card it holds.
  const maxColumn = Math.max(0, ...columnOf.values());
  const columnMembers: string[][] = Array.from({ length: maxColumn + 1 }, () => []);
  for (const node of nodes) columnMembers[columnOf.get(node.id) ?? 0].push(node.id);

  const columnX: number[] = [];
  let x = originX;
  for (let col = 0; col <= maxColumn; col++) {
    columnX[col] = x;
    const widths = columnMembers[col].map((id) => sizeOf(byId.get(id)!).width);
    x += (widths.length ? Math.max(...widths) : NODE_WIDTH) + columnGap;
  }

  /* -------------------------------- rows --------------------------------- */

  // Vertical order inside a column follows a left-first, post-order walk: each
  // join's inputs are emitted before the join, so the running result stays on
  // top and each newly joined table lands directly beneath it.
  const order: string[] = [];
  const seen = new Set<string>();
  function walk(id: string): void {
    if (seen.has(id)) return;
    seen.add(id);
    for (const inputId of inputsOf(byId.get(id))) walk(inputId);
    order.push(id);
  }
  const roots = nodes.filter((node) => !(consumers.get(node.id)?.length));
  roots.sort((a, b) => {
    const rank = (node: CanvasNode) => (inputsOf(node).length > 0 ? 0 : 1);
    return rank(a) - rank(b) || nodes.indexOf(a) - nodes.indexOf(b);
  });
  for (const root of roots) walk(root.id);
  for (const node of nodes) walk(node.id); // any leftovers (e.g. cycles)
  const orderIndex = new Map(order.map((id, index) => [id, index]));

  // Pack each column top-to-bottom with a fixed gap, so a joined pair always
  // sits `rowGap` apart. A join is nudged down to centre on its inputs (which
  // live in an earlier column, already placed), but never past the packing
  // cursor, which keeps same-column cards from overlapping.
  const yTop = new Map<string, number>();
  for (let col = 0; col <= maxColumn; col++) {
    const members = columnMembers[col]
      .slice()
      .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));

    let cursor = originY;
    for (const id of members) {
      const inputs = inputsOf(byId.get(id));
      let desiredTop: number | null = null;
      if (inputs.length) {
        let minTop = Infinity;
        let maxBottom = -Infinity;
        for (const inputId of inputs) {
          const top = yTop.get(inputId);
          if (top === undefined) continue;
          minTop = Math.min(minTop, top);
          maxBottom = Math.max(maxBottom, top + heightOf(inputId));
        }
        if (Number.isFinite(minTop)) desiredTop = (minTop + maxBottom) / 2 - heightOf(id) / 2;
      }
      const top = desiredTop !== null ? Math.max(desiredTop, cursor) : cursor;
      yTop.set(id, top);
      cursor = top + heightOf(id) + rowGap;
    }
  }

  const positions = new Map<string, Point>();
  for (const node of nodes) {
    positions.set(node.id, { x: columnX[columnOf.get(node.id) ?? 0], y: yTop.get(node.id) ?? originY });
  }
  return positions;
}

/** Collects the leaf table columns flowing out of a node as qualified field options. */
export function collectSourceFields(nodes: CanvasNode[], id: string | undefined): FieldOption[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const fields: FieldOption[] = [];

  function walk(currentId: string | undefined): void {
    if (!currentId || seen.has(currentId)) return;
    seen.add(currentId);
    const node = byId.get(currentId);
    if (!node) return;

    if (node.type === 'table') {
      for (const field of node.fields ?? []) {
        fields.push({ value: `${node.label}.${field.name}`, name: field.name, type: field.type, entity: node.label });
      }
      return;
    }
    for (const inputId of node.inputs ?? []) walk(inputId);
  }

  walk(id);
  return fields;
}

/** All field values currently referenced by any join condition (e.g. "Locations.id"). */
export function usedFieldValues(nodes: CanvasNode[]): Set<string> {
  const used = new Set<string>();
  for (const node of nodes) {
    if (node.type !== 'join') continue;
    for (const condition of node.conditions ?? []) {
      if (condition.leftField) used.add(condition.leftField);
      if (condition.rightField) used.add(condition.rightField);
    }
  }
  return used;
}

/** Derives the edges to draw, tagged by which port (left/right/output) they feed. */
export function buildConnections(nodes: CanvasNode[]): Connection[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const connections: Connection[] = [];

  for (const node of nodes) {
    if (node.type === 'join' && node.inputs) {
      const [leftId, rightId] = node.inputs;
      const left = leftId ? byId.get(leftId) : undefined;
      const right = rightId ? byId.get(rightId) : undefined;
      if (left) connections.push({ id: `${left.id}->${node.id}:l`, from: outputAnchor(left), to: inputAnchor(node, 0), kind: 'left' });
      if (right) connections.push({ id: `${right.id}->${node.id}:r`, from: outputAnchor(right), to: inputAnchor(node, 1), kind: 'right' });
    } else if (node.type === 'output' && node.inputs?.[0]) {
      const source = byId.get(node.inputs[0]);
      if (source) connections.push({ id: `${source.id}->${node.id}`, from: outputAnchor(source), to: inputAnchor(node, 0), kind: 'output' });
    }
  }

  return connections;
}

/** Returns a new list with the node removed plus every join that (transitively) depends on it. */
export function removeNodeAndDependents(nodes: CanvasNode[], id: string): CanvasNode[] {
  const target = nodes.find((node) => node.id === id);
  if (!target || target.type === 'output') return nodes;

  const condemned = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (condemned.has(node.id) || node.type === 'output') continue;
      if (node.type === 'join' && node.inputs?.some((input) => condemned.has(input))) {
        condemned.add(node.id);
        changed = true;
      }
    }
  }

  const survivors = nodes.filter((node) => !condemned.has(node.id));
  // Clear dangling references (e.g. the output node pointing at a removed source).
  for (const node of survivors) {
    if (node.inputs) node.inputs = node.inputs.filter((input) => !condemned.has(input));
  }
  return survivors;
}

/** True when joining these two ids would be valid (distinct, real, not the output, not already joined). */
export function canJoin(nodes: CanvasNode[], leftId: string, rightId: string): boolean {
  if (leftId === rightId) return false;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const left = byId.get(leftId);
  const right = byId.get(rightId);
  if (!left || !right) return false;
  if (left.type === 'output' || right.type === 'output') return false;

  const alreadyJoined = nodes.some(
    (node) =>
      node.type === 'join' &&
      node.inputs?.includes(leftId) &&
      node.inputs?.includes(rightId),
  );
  return !alreadyJoined;
}

/**
 * Suggests which node should feed the Output while it is still unconnected.
 *
 * Picks the terminal join (a join no other node consumes); with several, the
 * one with the deepest chain wins, since that is most likely the final result.
 * Returns undefined when the Output is already wired or there is no join yet.
 */
export function findSuggestedOutputSource(nodes: CanvasNode[]): string | undefined {
  const output = nodes.find(isOutputNode);
  if (!output || (output.inputs?.length ?? 0) > 0) return undefined;

  const consumed = new Set<string>();
  for (const node of nodes) {
    for (const input of node.inputs ?? []) consumed.add(input);
  }

  const terminalJoins = nodes.filter((node) => node.type === 'join' && !consumed.has(node.id));
  if (terminalJoins.length <= 1) return terminalJoins[0]?.id;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depthCache = new Map<string, number>();
  function depthOf(id: string, visiting: Set<string>): number {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    let depth = 0;
    for (const inputId of byId.get(id)?.inputs ?? []) {
      if (visiting.has(inputId)) continue;
      visiting.add(inputId);
      depth = Math.max(depth, depthOf(inputId, visiting) + 1);
      visiting.delete(inputId);
    }
    depthCache.set(id, depth);
    return depth;
  }

  return [...terminalJoins].sort(
    (a, b) => depthOf(b.id, new Set([b.id])) - depthOf(a.id, new Set([a.id])),
  )[0].id;
}

/** Deep, reference-free copy of a node list (safe to store in history). */
export function cloneNodes(nodes: CanvasNode[]): CanvasNode[] {
  return JSON.parse(JSON.stringify(nodes)) as CanvasNode[];
}

function parseStoredNodes(raw: string | null): CanvasNode[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CanvasNode[]) : [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Composable: reactive state + persistence wired around the pure helpers     */
/* -------------------------------------------------------------------------- */

export function useDataSourceCanvas() {
  const nodes: Ref<CanvasNode[]> = ref([createOutputNode(900, 220)]);
  const connections = computed(() => buildConnections(nodes.value));

  function findNode(id: string): CanvasNode | undefined {
    return nodes.value.find((node) => node.id === id);
  }

  function ensureOutput(): void {
    if (!nodes.value.some(isOutputNode)) {
      nodes.value.push(createOutputNode(900, 220));
    }
  }

  function loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    const stored = parseStoredNodes(window.localStorage.getItem(STORAGE_KEY));
    if (stored.length) nodes.value = stored;
    ensureOutput();
  }

  function saveToStorage(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes.value));
  }

  /* ----------------------------- undo / redo ----------------------------- */

  const history = createHistory<CanvasNode[]>({ limit: 50 });
  const canUndo = ref(false);
  const canRedo = ref(false);
  // Snapshot of the last committed state; guards against pushing no-op commits
  // (e.g. a rejected join) and against re-recording undo/redo restorations.
  let lastSnapshot = '';

  function syncHistoryFlags(): void {
    canUndo.value = history.canUndo();
    canRedo.value = history.canRedo();
  }

  /** Records the current canvas as a distinct undo step (skips no-op changes). */
  function commit(): void {
    const snapshot = JSON.stringify(nodes.value);
    if (snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;
    history.push(JSON.parse(snapshot) as CanvasNode[]);
    syncHistoryFlags();
  }

  function applySnapshot(state: CanvasNode[] | undefined): void {
    if (!state) return;
    nodes.value = cloneNodes(state);
    ensureOutput();
    lastSnapshot = JSON.stringify(nodes.value);
    syncHistoryFlags();
  }

  function undo(): void {
    applySnapshot(history.undo());
  }

  function redo(): void {
    applySnapshot(history.redo());
  }

  function resetHistory(): void {
    lastSnapshot = JSON.stringify(nodes.value);
    history.reset(JSON.parse(lastSnapshot) as CanvasNode[]);
    syncHistoryFlags();
  }

  /** Wraps a discrete mutation so it records an undo step once it completes. */
  function committing<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
    return (...args: A): R => {
      const result = fn(...args);
      commit();
      return result;
    };
  }

  function addTable(item: SourceItem, x: number, y: number): CanvasNode {
    const node = createTableNode(item, x, y);
    nodes.value.push(node);
    return node;
  }

  function moveNode(id: string, x: number, y: number): void {
    const node = findNode(id);
    if (!node) return;
    node.x = x;
    node.y = y;
  }

  function joinNodes(leftId: string, rightId: string): CanvasNode | undefined {
    if (!canJoin(nodes.value, leftId, rightId)) return undefined;
    const left = findNode(leftId);
    const right = findNode(rightId);
    if (!left || !right) return undefined;

    const position = computeJoinPosition(left, right);
    const join = createJoinNode(leftId, rightId, position.x, position.y);
    nodes.value.push(join);
    return join;
  }

  function connectToOutput(sourceId: string): void {
    const output = nodes.value.find(isOutputNode);
    const source = findNode(sourceId);
    if (!output || !source || source.type === 'output') return;
    output.inputs = [sourceId];
  }

  function setJoinType(id: string, joinType: JoinType): void {
    const node = findNode(id);
    if (node?.type === 'join') node.joinType = joinType;
  }

  function swapInputs(id: string): void {
    const node = findNode(id);
    if (node?.type === 'join' && node.inputs?.length === 2) {
      node.inputs = [node.inputs[1], node.inputs[0]];
      for (const condition of node.conditions ?? []) {
        [condition.leftField, condition.rightField] = [condition.rightField, condition.leftField];
      }
    }
  }

  function addCondition(id: string): void {
    const node = findNode(id);
    if (node?.type !== 'join') return;
    node.conditions = [...(node.conditions ?? []), { id: createId('cond'), leftField: '', rightField: '' }];
  }

  function updateCondition(id: string, conditionId: string, side: 'leftField' | 'rightField', value: string): void {
    const node = findNode(id);
    const condition = node?.conditions?.find((item) => item.id === conditionId);
    if (condition) condition[side] = value;
  }

  function removeCondition(id: string, conditionId: string): void {
    const node = findNode(id);
    if (node?.type === 'join' && node.conditions) {
      node.conditions = node.conditions.filter((item) => item.id !== conditionId);
    }
  }

  function toggleCollapse(id: string): void {
    const node = findNode(id);
    if (node) node.collapsed = !node.collapsed;
  }

  /** Sets a card's display name. A blank name clears it, reverting to the default. */
  function setNodeName(id: string, name: string): void {
    const node = findNode(id);
    if (!node) return;
    const trimmed = name.trim();
    node.customName = trimmed ? trimmed : undefined;
  }

  /** Sets a card's width, clamped to the allowed range. */
  function setNodeWidth(id: string, width: number): void {
    const node = findNode(id);
    if (node) node.width = clampNodeWidth(width);
  }

  /** Collapses or expands every collapsible card at once (Output has no compact form). */
  function setAllCollapsed(collapsed: boolean): void {
    for (const node of nodes.value) {
      if (node.type === 'output') continue;
      node.collapsed = collapsed;
    }
  }

  function removeNode(id: string): void {
    nodes.value = removeNodeAndDependents(nodes.value, id);
  }

  function clear(): void {
    nodes.value = nodes.value.filter(isOutputNode);
    ensureOutput();
    const output = nodes.value.find(isOutputNode);
    if (output) output.inputs = [];
  }

  /** Replaces the whole canvas with a prebuilt set of nodes (e.g. a demo preset). */
  function loadPreset(preset: CanvasNode[]): void {
    nodes.value = preset;
    ensureOutput();
  }

  /** Re-flows every card into a tidy left-to-right layered layout (on demand). */
  function tidyLayout(): void {
    const used = usedFieldValues(nodes.value);
    const activeFieldCount = (node: CanvasNode): number =>
      (node.fields ?? []).filter((field) => used.has(`${node.label}.${field.name}`)).length;

    const positions = computeLayout(nodes.value, {
      sizeOf: (node) =>
        nodeSize(node, node.type === 'table' && node.collapsed ? activeFieldCount(node) : 0),
    });

    for (const node of nodes.value) {
      const point = positions.get(node.id);
      if (point) {
        node.x = point.x;
        node.y = point.y;
      }
    }
  }

  onMounted(() => {
    loadFromStorage();
    resetHistory();
  });
  watch(nodes, saveToStorage, { deep: true });

  return {
    nodes,
    connections,
    findNode,
    // Continuous gestures: the UI commits once when the drag/resize ends.
    moveNode,
    setNodeWidth,
    commit,
    // Undo / redo
    undo,
    redo,
    canUndo,
    canRedo,
    // Discrete mutations: each records its own undo step.
    addTable: committing(addTable),
    joinNodes: committing(joinNodes),
    connectToOutput: committing(connectToOutput),
    setJoinType: committing(setJoinType),
    swapInputs: committing(swapInputs),
    addCondition: committing(addCondition),
    updateCondition: committing(updateCondition),
    removeCondition: committing(removeCondition),
    toggleCollapse: committing(toggleCollapse),
    setAllCollapsed: committing(setAllCollapsed),
    setNodeName: committing(setNodeName),
    removeNode: committing(removeNode),
    clear: committing(clear),
    loadPreset: committing(loadPreset),
    tidyLayout: committing(tidyLayout),
  };
}
