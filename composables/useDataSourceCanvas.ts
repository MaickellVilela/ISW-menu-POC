import { ref, computed, onMounted, watch, type Ref } from 'vue';

export type CanvasNodeType = 'table' | 'join' | 'output';
export type JoinType = 'inner' | 'left' | 'full';

export interface SourceItem {
  key: string;
  label: string;
  description: string;
  fields: string[];
}

export interface JoinCondition {
  id: string;
  leftField: string;
  rightField: string;
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  label: string;
  x: number;
  y: number;
  /** Table nodes expose the columns that joins can match on. */
  fields?: string[];
  /** Join nodes: [leftId, rightId]. Output node: [sourceId]. */
  inputs?: string[];
  /** Join nodes only. */
  joinType?: JoinType;
  /** Join nodes only. */
  conditions?: JoinCondition[];
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

/** Vertical offsets (from a node's top) where connection ports are anchored. */
export const PORT_DY = 46;
export const JOIN_RIGHT_PORT_DY = 74;

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
  return { id: createId('table'), type: 'table', label: item.label, x, y, fields: [...item.fields] };
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

/** Output port (right edge) for any node that can feed downstream. */
export function outputAnchor(node: CanvasNode): Point {
  return { x: node.x + NODE_WIDTH, y: node.y + PORT_DY };
}

/** Input port (left edge). Slot 1 is the Right input of a join; everything else uses slot 0. */
export function inputAnchor(node: CanvasNode, slot = 0): Point {
  const dy = node.type === 'join' && slot === 1 ? JOIN_RIGHT_PORT_DY : PORT_DY;
  return { x: node.x, y: node.y + dy };
}

/** Suggested spot for a new join node: to the right of, and between, its inputs. */
export function computeJoinPosition(a: CanvasNode, b: CanvasNode): Point {
  return {
    x: Math.max(a.x, b.x) + NODE_WIDTH + 96,
    y: (a.y + b.y) / 2,
  };
}

/** Collects the leaf table columns flowing out of a node as "Entity.field" strings. */
export function collectSourceFields(nodes: CanvasNode[], id: string | undefined): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const fields: string[] = [];

  function walk(currentId: string | undefined): void {
    if (!currentId || seen.has(currentId)) return;
    seen.add(currentId);
    const node = byId.get(currentId);
    if (!node) return;

    if (node.type === 'table') {
      for (const field of node.fields ?? []) fields.push(`${node.label}.${field}`);
      return;
    }
    for (const inputId of node.inputs ?? []) walk(inputId);
  }

  walk(id);
  return fields;
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

  function removeNode(id: string): void {
    nodes.value = removeNodeAndDependents(nodes.value, id);
  }

  function clear(): void {
    nodes.value = nodes.value.filter(isOutputNode);
    ensureOutput();
    const output = nodes.value.find(isOutputNode);
    if (output) output.inputs = [];
  }

  onMounted(loadFromStorage);
  watch(nodes, saveToStorage, { deep: true });

  return {
    nodes,
    connections,
    findNode,
    addTable,
    moveNode,
    joinNodes,
    connectToOutput,
    setJoinType,
    swapInputs,
    addCondition,
    updateCondition,
    removeCondition,
    removeNode,
    clear,
  };
}
