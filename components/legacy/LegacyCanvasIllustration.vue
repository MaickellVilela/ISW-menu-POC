<script setup lang="ts">
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';

/** Static replica of the legacy Source Creation tab. Decorative only: no handlers. */
withDefaults(defineProps<{ updating?: boolean }>(), { updating: false });

const ICON_GIT_COMMIT =
  'M15 7h-3.14c-.45-1.72-2-3-3.86-3S4.59 5.28 4.14 7H1c-.55 0-1 .45-1 1s.45 1 1 1h3.14c.45 1.72 2 3 3.86 3s3.41-1.28 3.86-3H15c.55 0 1-.45 1-1s-.45-1-1-1zm-7 3c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z';
const ICON_GIT_MERGE =
  'M12 6c-1.3 0-2.4.84-2.82 2H9c-1.62 0-3-.96-3.63-2.34C6.33 5.16 7 4.16 7 3c0-1.66-1.34-3-3-3S1 1.34 1 3c0 1.3.84 2.4 2 2.81v4.37C1.84 10.6 1 11.7 1 13c0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.3-.84-2.4-2-2.82V8.43A5.89 5.89 0 009 10h.18A2.996 2.996 0 0015 9c0-1.66-1.34-3-3-3zm-8 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM4 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z';
const ICON_MINUS_CIRCLE =
  'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM7 11H17V13H7V11Z';
const ICON_OUTPUT =
  'M18 16V14H19V4H6V14.0354C6.1633 14.0121 6.33024 14 6.5 14H8V16H6.5C5.67157 16 5 16.6716 5 17.5C5 18.3284 5.67157 19 6.5 19H10V21H6.5C4.567 21 3 19.433 3 17.5V5C3 3.34315 4.34315 2 6 2H20C20.5523 2 21 2.44772 21 3V20C21 20.5523 20.5523 21 20 21H16V19H19V16H18ZM7 5H9V7H7V5ZM7 8H9V10H7V8ZM14 17V23H12V17H9L13 12L17 17H14Z';
const ICON_ZOOM_IN = 'M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z';
const ICON_ZOOM_OUT = 'M0 0h32v4.2H0z';
const ICON_FIT_VIEW =
  'M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z';
const ICON_LOCK =
  'M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z';
const ICON_DATABASE =
  'M5 12.5C5 12.8134 5.46101 13.3584 6.53047 13.8931C7.91405 14.5849 9.87677 15 12 15C14.1232 15 16.0859 14.5849 17.4695 13.8931C18.539 13.3584 19 12.8134 19 12.5V10.3287C17.35 11.3482 14.8273 12 12 12C9.17273 12 6.64996 11.3482 5 10.3287V12.5ZM19 15.3287C17.35 16.3482 14.8273 17 12 17C9.17273 17 6.64996 16.3482 5 15.3287V17.5C5 17.8134 5.46101 18.3584 6.53047 18.8931C7.91405 19.5849 9.87677 20 12 20C14.1232 20 16.0859 19.5849 17.4695 18.8931C18.539 18.3584 19 17.8134 19 17.5V15.3287ZM3 17.5V7.5C3 5.01472 7.02944 3 12 3C16.9706 3 21 5.01472 21 7.5V17.5C21 19.9853 16.9706 22 12 22C7.02944 22 3 19.9853 3 17.5ZM12 10C14.1232 10 16.0859 9.58492 17.4695 8.89313C18.539 8.3584 19 7.81342 19 7.5C19 7.18658 18.539 6.6416 17.4695 6.10687C16.0859 5.41508 14.1232 5 12 5C9.87677 5 7.91405 5.41508 6.53047 6.10687C5.46101 6.6416 5 7.18658 5 7.5C5 7.81342 5.46101 8.3584 6.53047 8.89313C7.91405 9.58492 9.87677 10 12 10Z';
const ICON_PROPERTIES =
  'M2 18H9V20H2V18ZM2 11H11V13H2V11ZM2 4H22V6H2V4ZM20.674 13.0251L21.8301 12.634L22.8301 14.366L21.914 15.1711C21.9704 15.4386 22 15.7158 22 16C22 16.2842 21.9704 16.5614 21.914 16.8289L22.8301 17.634L21.8301 19.366L20.674 18.9749C20.2635 19.3441 19.7763 19.6295 19.2391 19.8044L19 21H17L16.7609 19.8044C16.2237 19.6295 15.7365 19.3441 15.326 18.9749L14.1699 19.366L13.1699 17.634L14.086 16.8289C14.0296 16.5614 14 16.2842 14 16C14 15.7158 14.0296 15.4386 14.086 15.1711L13.1699 14.366L14.1699 12.634L15.326 13.0251C15.7365 12.6559 16.2237 12.3705 16.7609 12.1956L17 11H19L19.2391 12.1956C19.7763 12.3705 20.2635 12.6559 20.674 13.0251ZM18 18C19.1046 18 20 17.1046 20 16C20 14.8954 19.1046 14 18 14C16.8954 14 16 14.8954 16 16C16 17.1046 16.8954 18 18 18Z';
const ICON_PLUG =
  'M13 18V20H19V22H13C11.8954 22 11 21.1046 11 20V18H8C5.79086 18 4 16.2091 4 14V7C4 6.44772 4.44772 6 5 6H8V2H10V6H14V2H16V6H19C19.5523 6 20 6.44772 20 7V14C20 16.2091 18.2091 18 16 18H13ZM8 16H16C17.1046 16 18 15.1046 18 14V11H6V14C6 15.1046 6.89543 16 8 16ZM18 8H6V9H18V8ZM12 14.5C11.4477 14.5 11 14.0523 11 13.5C11 12.9477 11.4477 12.5 12 12.5C12.5523 12.5 13 12.9477 13 13.5C13 14.0523 12.5523 14.5 12 14.5Z';
const ICON_FILE =
  'M21 8V20.9932C21 21.5501 20.5552 22 20.0066 22H3.9934C3.44495 22 3 21.556 3 21.0082V2.9918C3 2.45531 3.4487 2 4.00221 2H14.9968L21 8ZM19 9H14V4H5V20H19V9ZM8 7H11V9H8V7ZM8 11H16V13H8V11ZM8 15H16V17H8V15Z';
const ICON_CHEVRON_RIGHT =
  'M10.71 7.29l-4-4a1.003 1.003 0 00-1.42 1.42L8.59 8 5.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71l4-4c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71z';

interface FlowNode {
  id: string;
  label: string;
  kind: 'table' | 'join' | 'output';
  /** Translate in flow coordinates, as in the legacy HTML. */
  x: number;
  y: number;
  /** Fixed so the legacy edge paths meet the handles exactly. */
  width: number;
  target: boolean;
  source: boolean;
}

const NODES: FlowNode[] = [
  { id: 'orders', label: 'orders', kind: 'table', x: 49.6219, y: 121.73, width: 124.6, target: false, source: true },
  { id: 'order_items', label: 'order_items', kind: 'table', x: 37.5141, y: 209.513, width: 155, target: false, source: true },
  { id: 'join', label: 'Join', kind: 'join', x: 294.577, y: 151.445, width: 113.5, target: true, source: true },
  { id: 'output', label: 'Output', kind: 'output', x: 374.612, y: 284.728, width: 98, target: true, source: false },
];

const EDGES = [
  'M178.22347062720848 140.72968197879862L198.22347062720848 140.72968197879862L 229.4001628754417,140.72968197879862Q 234.4001628754417,140.72968197879862 234.4001628754417,145.72968197879862L 234.4001628754417,165.4449329174028Q 234.4001628754417,170.4449329174028 239.4001628754417,170.4449329174028L270.57685512367493 170.4449329174028L290.57685512367493 170.4449329174028',
  'M196.5063217756184 228.51325088339223L216.5063217756184 228.51325088339223L 238.54158844964667,228.51325088339223Q 243.54158844964667,228.51325088339223 243.54158844964667,223.51325088339223L 243.54158844964667,175.4449329174028Q 243.54158844964667,170.4449329174028 248.54158844964667,170.4449329174028L270.57685512367493 170.4449329174028L290.57685512367493 170.4449329174028',
  'M412.12373012367493 170.4449329174028L 427.12373012367493,170.4449329174028Q 432.12373012367493,170.4449329174028 432.12373012367493,175.4449329174028L 432.12373012367493,232.08656898741165Q 432.12373012367493,237.08656898741165 427.12373012367493,237.08656898741165L 355.612190812721,237.08656898741165Q 350.612190812721,237.08656898741165 350.612190812721,242.08656898741165L 350.612190812721,298.7282050574205Q 350.612190812721,303.7282050574205 355.612190812721,303.7282050574205L370.612190812721 303.7282050574205',
];

const TREE = [
  { label: 'Marketing data', logo: CONNECTOR_ICONS.postgresql },
  { label: 'Healthcare data', logo: CONNECTOR_ICONS.postgresql },
  { label: 'Snowflake', logo: CONNECTOR_ICONS.snowflake },
];
</script>

<template>
  <div class="lg-chrome lg-body lg-static">
    <div class="lg-canvas">
      <div class="lg-add-join" aria-hidden="true">
        <span class="bp3-button lg-btn-outline">
          <span class="bp3-icon lg-icon-dark">
            <svg width="16" height="16" viewBox="0 0 16 16"><path :d="ICON_GIT_COMMIT" fill-rule="evenodd" /></svg>
          </span>
          <span class="bp3-button-text">Add Join</span>
        </span>
      </div>
      <div class="lg-toggle" aria-hidden="true">
        <span class="bp3-button bp3-intent-primary"><span class="bp3-button-text">Entity</span></span>
        <span class="bp3-button lg-btn-outline"><span class="bp3-button-text">Filter Value</span></span>
      </div>

      <div class="lg-flow" aria-hidden="true">
        <div class="react-flow__viewport">
          <svg class="react-flow__edges" width="564" height="635">
            <defs>
              <marker
                id="lg-rf-arrowclosed"
                markerWidth="12.5"
                markerHeight="12.5"
                viewBox="-10 -10 20 20"
                markerUnits="strokeWidth"
                orient="auto-start-reverse"
                refX="0"
                refY="0"
              >
                <polyline
                  points="-5,-4 0,0 -5,4 -5,-4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke="rgb(103, 120, 142)"
                  fill="rgb(103, 120, 142)"
                  stroke-width="1"
                />
              </marker>
            </defs>
            <path
              v-for="(d, i) in EDGES"
              :key="i"
              class="react-flow__edge-path"
              :d="d"
              marker-end="url(#lg-rf-arrowclosed)"
            />
          </svg>
          <div
            v-for="node in NODES"
            :key="node.id"
            class="react-flow__node"
            :style="{ transform: `translate(${node.x}px, ${node.y}px)` }"
          >
            <div class="lg-node" :class="{ 'lg-node-join': node.kind === 'join' }" :style="{ width: `${node.width}px` }">
              <img v-if="node.kind === 'table'" :src="CONNECTOR_ICONS.postgresql" alt="" class="lg-node-logo">
              <span v-else-if="node.kind === 'join'" class="bp3-icon lg-node-lead">
                <svg width="16" height="16" viewBox="0 0 16 16"><path :d="ICON_GIT_MERGE" fill-rule="evenodd" /></svg>
              </span>
              <span v-else class="bp3-icon lg-node-lead">
                <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_OUTPUT" /></svg>
              </span>
              <span class="lg-node-label">{{ node.label }}</span>
              <span v-if="node.kind !== 'output'" class="bp3-icon lg-node-minus">
                <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_MINUS_CIRCLE" /></svg>
              </span>
            </div>
            <span v-if="node.target" class="react-flow__handle react-flow__handle-left" />
            <span v-if="node.source" class="react-flow__handle react-flow__handle-right" />
          </div>
        </div>

        <div class="react-flow__panel react-flow__controls bottom left">
          <span class="react-flow__controls-button" title="zoom in">
            <svg viewBox="0 0 32 32"><path :d="ICON_ZOOM_IN" /></svg>
          </span>
          <span class="react-flow__controls-button" title="zoom out">
            <svg viewBox="0 0 32 5"><path :d="ICON_ZOOM_OUT" /></svg>
          </span>
          <span class="react-flow__controls-button" title="fit view">
            <svg viewBox="0 0 32 30"><path :d="ICON_FIT_VIEW" /></svg>
          </span>
          <span class="react-flow__controls-button" title="toggle interactivity">
            <svg viewBox="0 0 25 32"><path :d="ICON_LOCK" /></svg>
          </span>
        </div>
      </div>

      <div v-if="updating" class="lg-shimmer" aria-live="polite" aria-busy="true">
        <span class="relative z-10 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-[#3B1770] shadow-sm">
          Updating preview…
        </span>
      </div>
    </div>

    <div class="lg-panel" aria-hidden="true">
      <div class="lg-rail">
        <div class="bp3-button-group bp3-minimal bp3-vertical">
          <span class="bp3-button bp3-minimal bp3-active" title="Data Source">
            <span class="bp3-icon">
              <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_DATABASE" /></svg>
            </span>
          </span>
          <span class="bp3-button bp3-minimal" title="Properties">
            <span class="bp3-icon">
              <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_PROPERTIES" /></svg>
            </span>
          </span>
        </div>
      </div>

      <div class="lg-panel-main">
        <div class="bp3-tab-list lg-subtabs">
          <div class="bp3-tab lg-tab-on">
            <span class="lg-subtab-inner lg-subtab-strong">
              <span class="bp3-icon">
                <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_PLUG" /></svg>
              </span>
              <span>Connections</span>
            </span>
          </div>
          <div class="bp3-tab">
            <span class="lg-subtab-inner lg-subtab-muted">
              <span class="bp3-icon">
                <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_FILE" /></svg>
              </span>
              <span>Files</span>
            </span>
          </div>
        </div>

        <div class="bp3-tree lg-tree">
          <ul class="bp3-tree-node-list bp3-tree-root">
            <li v-for="item in TREE" :key="item.label" class="bp3-tree-node">
              <div class="bp3-tree-node-content">
                <span class="bp3-icon bp3-tree-node-caret">
                  <svg width="16" height="16" viewBox="0 0 16 16"><path :d="ICON_CHEVRON_RIGHT" fill-rule="evenodd" /></svg>
                </span>
                <span class="bp3-tree-node-label lg-tree-label">
                  <img :src="item.logo" alt="" class="lg-tree-logo">
                  <span class="lg-tree-text">{{ item.label }}</span>
                </span>
              </div>
            </li>
          </ul>
        </div>

        <span class="bp3-button lg-btn-outline lg-add-sql">
          <span class="bp3-button-text">Add SQL Entity</span>
        </span>
      </div>
    </div>
  </div>
</template>
