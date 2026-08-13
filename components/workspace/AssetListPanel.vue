<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import {
  ARTIFACT_SECTION_HELP,
  IMPORTABLE_SOURCES,
  filterAssetsByQuery,
  formatAssetModifiedAt,
  partitionSourceAssets,
  sortAssets,
  type ArtifactSectionId,
  type AssetSortKey,
  type ContextAttachment,
  type WorkspaceAsset,
} from '~/composables/useWorkspaceAssets';

const props = defineProps<{
  assets: WorkspaceAsset[];
  attachments: ContextAttachment[];
  openAssetId: string | null;
  selectedIds: string[];
  canPublish: boolean;
}>();

const emit = defineEmits<{
  open: [id: string];
  import: [sourceId: string];
  rename: [payload: { id: string; name: string }];
  delete: [ids: string[]];
  'remove-attachment': [id: string];
  publish: [];
  hide: [];
  'update:selectedIds': [ids: string[]];
}>();

const SOURCE_MENU_ACTIONS = [
  'Permissions',
  'Row Security',
  'Column Security',
  'Clear cache',
  'Available Visual Types',
  'Export source',
] as const;

const searchQuery = ref('');
const sortKey = ref<AssetSortKey>('modifiedAt');
const sortDirection = ref<'asc' | 'desc'>('desc');
const isImportOpen = ref(false);
const menuAssetId = ref<string | null>(null);
const renamingId = ref<string | null>(null);
const renameDraft = ref('');

/** Sections stay open so empty-state help is visible when the panel is shown. */
const sectionOpen = ref<Record<ArtifactSectionId, boolean>>({
  context: true,
  imported: true,
  generated: true,
});

const SORT_OPTIONS: { value: AssetSortKey; label: string }[] = [
  { value: 'modifiedAt', label: 'Modified' },
  { value: 'name', label: 'Name' },
  { value: 'author', label: 'Author' },
];

const filteredAttachments = computed(() => {
  const normalized = searchQuery.value.trim().toLowerCase();
  if (!normalized) return props.attachments;
  return props.attachments.filter((attachment) =>
    attachment.name.toLowerCase().includes(normalized),
  );
});

const visibleSources = computed(() =>
  sortAssets(filterAssetsByQuery(props.assets, searchQuery.value), sortKey.value, sortDirection.value),
);

const sectionedSources = computed(() => partitionSourceAssets(visibleSources.value));

const artifactCount = computed(() => props.assets.length + props.attachments.length);

const allVisibleSelected = computed(
  () =>
    visibleSources.value.length > 0 &&
    visibleSources.value.every((asset) => props.selectedIds.includes(asset.id)),
);

const alreadyImportedNames = computed(
  () =>
    new Set(
      props.assets.filter((asset) => asset.origin === 'imported').map((asset) => asset.name),
    ),
);

const hasAnyVisible = computed(
  () =>
    filteredAttachments.value.length > 0 ||
    sectionedSources.value.imported.length > 0 ||
    sectionedSources.value.generated.length > 0,
);

watch(
  () => props.attachments.length,
  (count, previous) => {
    if (count > 0 && previous === 0) sectionOpen.value.context = true;
  },
);

watch(
  () => props.assets.filter((asset) => asset.origin === 'imported').length,
  (count, previous) => {
    if (count > 0 && previous === 0) sectionOpen.value.imported = true;
  },
);

watch(
  () => props.assets.filter((asset) => asset.origin === 'generated').length,
  (count, previous) => {
    if (count > 0 && previous === 0) sectionOpen.value.generated = true;
  },
);

watch(
  () => props.assets,
  (assets) => {
    if (renamingId.value && !assets.some((asset) => asset.id === renamingId.value)) {
      cancelRename();
    }
    if (menuAssetId.value && !assets.some((asset) => asset.id === menuAssetId.value)) {
      menuAssetId.value = null;
    }
  },
);

function isSectionOpen(id: ArtifactSectionId): boolean {
  return sectionOpen.value[id];
}

function toggleSection(id: ArtifactSectionId): void {
  sectionOpen.value[id] = !sectionOpen.value[id];
}

function isSelected(id: string): boolean {
  return props.selectedIds.includes(id);
}

function toggleSelect(id: string): void {
  if (isSelected(id)) {
    emit(
      'update:selectedIds',
      props.selectedIds.filter((selectedId) => selectedId !== id),
    );
    return;
  }
  emit('update:selectedIds', [...props.selectedIds, id]);
}

function toggleSelectAllVisible(): void {
  if (allVisibleSelected.value) {
    const visibleIds = new Set(visibleSources.value.map((asset) => asset.id));
    emit(
      'update:selectedIds',
      props.selectedIds.filter((id) => !visibleIds.has(id)),
    );
    return;
  }

  const merged = new Set([...props.selectedIds, ...visibleSources.value.map((asset) => asset.id)]);
  emit('update:selectedIds', [...merged]);
}

function toggleSortDirection(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
}

function openImport(): void {
  menuAssetId.value = null;
  isImportOpen.value = true;
}

function closeImport(): void {
  isImportOpen.value = false;
}

function importSource(sourceId: string): void {
  emit('import', sourceId);
  closeImport();
}

function toggleMenu(id: string): void {
  menuAssetId.value = menuAssetId.value === id ? null : id;
}

function closeMenu(): void {
  menuAssetId.value = null;
}

function onOpen(id: string): void {
  closeMenu();
  emit('open', id);
}

function onMenuAction(): void {
  closeMenu();
}

function startRename(asset: WorkspaceAsset): void {
  closeMenu();
  renamingId.value = asset.id;
  renameDraft.value = asset.name;
}

function cancelRename(): void {
  renamingId.value = null;
  renameDraft.value = '';
}

function commitRename(): void {
  if (!renamingId.value) return;
  const name = renameDraft.value.trim();
  if (!name) {
    cancelRename();
    return;
  }
  emit('rename', { id: renamingId.value, name });
  cancelRename();
}

function deleteOne(id: string): void {
  closeMenu();
  emit('delete', [id]);
}

function deleteSelected(): void {
  if (!props.selectedIds.length) return;
  emit('delete', [...props.selectedIds]);
}

function removeAttachment(id: string): void {
  emit('remove-attachment', id);
}

function onPublish(): void {
  if (!props.canPublish) return;
  emit('publish');
}

function hidePanel(): void {
  emit('hide');
}

function sectionHelp(id: ArtifactSectionId): string {
  return ARTIFACT_SECTION_HELP[id];
}

defineExpose({ openImport });

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('[data-asset-menu]')) {
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
});
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col bg-white">
    <div class="flex flex-shrink-0 items-center justify-between border-b border-[#E2E2E2] px-4 py-2.5">
      <span class="text-sm font-medium text-[#25262E]">Artifacts</span>
      <div class="flex items-center gap-1">
        <span class="text-[11px] text-[#9A9A9A]">{{ artifactCount }}</span>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-[#6B6B6B] transition-colors hover:bg-[#F1F1F1] hover:text-[#25262E]"
          title="Hide artifacts"
          aria-label="Hide artifacts"
          @click="hidePanel"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex flex-shrink-0 flex-col gap-2 border-b border-[#E2E2E2] px-3 py-2.5">
      <div class="relative">
        <svg
          viewBox="0 0 24 24"
          class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" stroke-linecap="round" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search artifacts"
          class="h-8 w-full rounded-md border border-[#E2E2E2] bg-white pl-8 pr-2 text-[12px] text-[#25262E] outline-none placeholder:text-[#C4C4C4] focus:border-[#3B1770]"
        />
      </div>

      <div class="flex items-center gap-1.5">
        <label class="sr-only" for="artifact-sort">Sort by</label>
        <select
          id="artifact-sort"
          v-model="sortKey"
          class="h-8 min-w-0 flex-1 rounded-md border border-[#E2E2E2] bg-white px-2 text-[11px] text-[#25262E] outline-none focus:border-[#3B1770]"
        >
          <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <button
          type="button"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[#E2E2E2] text-[#6B6B6B] transition-colors hover:bg-[#F8F6FC]"
          :title="sortDirection === 'asc' ? 'Ascending' : 'Descending'"
          :aria-label="sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'"
          @click="toggleSortDirection"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path
              v-if="sortDirection === 'desc'"
              d="M8 7h8M8 12h5M8 17h2"
              stroke-linecap="round"
            />
            <path v-else d="M8 7h2M8 12h5M8 17h8" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div v-if="selectedIds.length" class="flex items-center justify-between gap-2">
        <span class="text-[11px] text-[#6B6B6B]">{{ selectedIds.length }} selected</span>
        <button
          type="button"
          class="text-[11px] font-medium text-[#B42318] transition-colors hover:underline"
          @click="deleteSelected"
        >
          Delete
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
      <div v-if="visibleSources.length" class="mb-1.5 flex items-center gap-2 px-1">
        <input
          type="checkbox"
          class="h-3.5 w-3.5 rounded border-[#C4C4C4] text-[#3B1770] focus:ring-[#3B1770]"
          :checked="allVisibleSelected"
          :aria-label="allVisibleSelected ? 'Deselect all' : 'Select all'"
          @change="toggleSelectAllVisible"
        />
        <span class="text-[11px] text-[#9A9A9A]">Select all sources</span>
      </div>

      <!-- Context attachments -->
      <section class="mb-1 border-b border-[#E2E2E2] pb-1">
        <div class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-[#F8F6FC]"
            :aria-expanded="isSectionOpen('context')"
            @click="toggleSection('context')"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-3 w-3 flex-shrink-0 text-[#9A9A9A] transition-transform"
              :class="isSectionOpen('context') ? 'rotate-90' : ''"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="text-[11px] font-medium uppercase tracking-wide text-[#6B6B6B]">
              Context attachments
            </span>
            <span class="text-[10px] text-[#C4C4C4]">{{ filteredAttachments.length }}</span>
          </button>
          <span v-if="filteredAttachments.length" class="group relative flex-shrink-0">
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded-full text-[#C4C4C4] transition-colors hover:bg-[#F8F6FC] hover:text-[#6B6B6B]"
              :aria-label="sectionHelp('context')"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5" stroke-linecap="round" />
                <circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <span
              role="tooltip"
              class="pointer-events-none invisible absolute right-0 top-6 z-30 w-56 rounded-md border border-[#E2E2E2] bg-white px-2.5 py-2 text-[11px] leading-relaxed text-[#6B6B6B] shadow-md group-hover:visible group-focus-within:visible"
            >
              {{ sectionHelp('context') }}
            </span>
          </span>
        </div>

        <div v-if="isSectionOpen('context')" class="mt-0.5 space-y-0.5 pb-1">
          <div
            v-for="attachment in filteredAttachments"
            :key="attachment.id"
            class="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-[#F8F6FC]"
          >
            <span
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[#F1F1F1] text-[9px] font-medium uppercase text-[#6B6B6B]"
              aria-hidden="true"
            >
              {{ attachment.kind === 'pdf' ? 'PDF' : 'IMG' }}
            </span>
            <span class="min-w-0 flex-1 truncate text-[12px] text-[#25262E]">{{ attachment.name }}</span>
            <button
              type="button"
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#9A9A9A] hover:bg-white hover:text-[#B42318]"
              :aria-label="`Remove ${attachment.name}`"
              @click="removeAttachment(attachment.id)"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <p v-if="!filteredAttachments.length" class="px-1.5 py-1 text-[11px] leading-relaxed text-[#9A9A9A]">
            {{ sectionHelp('context') }}
          </p>
        </div>
      </section>

      <!-- Imported sources -->
      <section class="mb-1 border-b border-[#E2E2E2] pb-1">
        <div class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-[#F8F6FC]"
            :aria-expanded="isSectionOpen('imported')"
            @click="toggleSection('imported')"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-3 w-3 flex-shrink-0 text-[#9A9A9A] transition-transform"
              :class="isSectionOpen('imported') ? 'rotate-90' : ''"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="text-[11px] font-medium uppercase tracking-wide text-[#6B6B6B]">Imported</span>
            <span class="text-[10px] text-[#C4C4C4]">{{ sectionedSources.imported.length }}</span>
          </button>
          <span v-if="sectionedSources.imported.length" class="group relative flex-shrink-0">
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded-full text-[#C4C4C4] transition-colors hover:bg-[#F8F6FC] hover:text-[#6B6B6B]"
              :aria-label="sectionHelp('imported')"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5" stroke-linecap="round" />
                <circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <span
              role="tooltip"
              class="pointer-events-none invisible absolute right-0 top-6 z-30 w-56 rounded-md border border-[#E2E2E2] bg-white px-2.5 py-2 text-[11px] leading-relaxed text-[#6B6B6B] shadow-md group-hover:visible group-focus-within:visible"
            >
              {{ sectionHelp('imported') }}
            </span>
          </span>
        </div>

        <div v-if="isSectionOpen('imported')" class="mt-0.5 space-y-1.5 pb-1">
          <article
            v-for="asset in sectionedSources.imported"
            :key="asset.id"
            class="relative rounded-md border px-2 py-2 transition-colors"
            :class="
              asset.id === openAssetId
                ? 'border-[#3B1770] bg-[#F5F1FC]'
                : isSelected(asset.id)
                  ? 'border-[#D4C4EF] bg-[#FBF9FE]'
                  : 'border-[#E2E2E2] hover:border-[#D4C4EF] hover:bg-[#F8F6FC]'
            "
          >
            <div class="flex items-start gap-2">
              <input
                type="checkbox"
                class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-[#C4C4C4] text-[#3B1770] focus:ring-[#3B1770]"
                :checked="isSelected(asset.id)"
                :aria-label="`Select ${asset.name}`"
                @click.stop
                @change="toggleSelect(asset.id)"
              />

              <button type="button" class="min-w-0 flex-1 text-left" @click="onOpen(asset.id)">
                <span class="flex items-start gap-2">
                  <img
                    v-if="asset.connector"
                    :src="CONNECTOR_ICONS[asset.connector]"
                    alt=""
                    class="mt-0.5 h-4 w-4 flex-shrink-0 object-contain"
                  />
                  <span class="min-w-0 flex-1">
                    <template v-if="renamingId === asset.id">
                      <input
                        v-model="renameDraft"
                        type="text"
                        class="mb-1 h-7 w-full rounded border border-[#3B1770] bg-white px-1.5 text-[12px] font-medium text-[#25262E] outline-none"
                        @click.stop
                        @keydown.enter.prevent="commitRename"
                        @keydown.esc.prevent="cancelRename"
                        @blur="commitRename"
                      />
                    </template>
                    <span v-else class="block truncate text-[12px] font-medium text-[#25262E]">
                      {{ asset.name }}
                    </span>
                    <span class="mt-0.5 block truncate text-[11px] text-[#9A9A9A]">{{ asset.subtitle }}</span>
                    <span class="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        v-for="tag in asset.tags"
                        :key="tag"
                        class="rounded bg-[#F1F1F1] px-1.5 py-0.5 text-[10px] text-[#6B6B6B]"
                      >
                        {{ tag }}
                      </span>
                    </span>
                    <span class="mt-1.5 block text-[10px] text-[#C4C4C4]">
                      {{ asset.author }} · {{ formatAssetModifiedAt(asset.modifiedAt) }}
                    </span>
                  </span>
                </span>
              </button>

              <div data-asset-menu class="relative flex-shrink-0">
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded text-[#9A9A9A] transition-colors hover:bg-white hover:text-[#25262E]"
                  :aria-expanded="menuAssetId === asset.id"
                  aria-label="Artifact actions"
                  @click.stop="toggleMenu(asset.id)"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="19" cy="12" r="1.5" />
                  </svg>
                </button>

                <div
                  v-if="menuAssetId === asset.id"
                  class="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-md border border-[#E2E2E2] bg-white py-1 shadow-md"
                  role="menu"
                >
                  <button
                    v-for="action in SOURCE_MENU_ACTIONS"
                    :key="action"
                    type="button"
                    class="block w-full px-3 py-1.5 text-left text-[12px] text-[#25262E] hover:bg-[#F8F6FC]"
                    role="menuitem"
                    @click="onMenuAction"
                  >
                    {{ action }}
                  </button>
                  <div class="my-1 border-t border-[#E2E2E2]"></div>
                  <button
                    type="button"
                    class="block w-full px-3 py-1.5 text-left text-[12px] text-[#25262E] hover:bg-[#F8F6FC]"
                    role="menuitem"
                    @click="startRename(asset)"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    class="block w-full px-3 py-1.5 text-left text-[12px] text-[#B42318] hover:bg-[#F8F6FC]"
                    role="menuitem"
                    @click="deleteOne(asset.id)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </article>
          <p v-if="!sectionedSources.imported.length" class="px-1.5 py-1 text-[11px] leading-relaxed text-[#9A9A9A]">
            {{ sectionHelp('imported') }}
          </p>
        </div>
      </section>

      <!-- Generated output -->
      <section class="mb-1">
        <div class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-[#F8F6FC]"
            :aria-expanded="isSectionOpen('generated')"
            @click="toggleSection('generated')"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-3 w-3 flex-shrink-0 text-[#9A9A9A] transition-transform"
              :class="isSectionOpen('generated') ? 'rotate-90' : ''"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="text-[11px] font-medium uppercase tracking-wide text-[#6B6B6B]">
              Generated output
            </span>
            <span class="text-[10px] text-[#C4C4C4]">{{ sectionedSources.generated.length }}</span>
          </button>
          <span v-if="sectionedSources.generated.length" class="group relative flex-shrink-0">
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded-full text-[#C4C4C4] transition-colors hover:bg-[#F8F6FC] hover:text-[#6B6B6B]"
              :aria-label="sectionHelp('generated')"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5" stroke-linecap="round" />
                <circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <span
              role="tooltip"
              class="pointer-events-none invisible absolute right-0 top-6 z-30 w-56 rounded-md border border-[#E2E2E2] bg-white px-2.5 py-2 text-[11px] leading-relaxed text-[#6B6B6B] shadow-md group-hover:visible group-focus-within:visible"
            >
              {{ sectionHelp('generated') }}
            </span>
          </span>
        </div>

        <div v-if="isSectionOpen('generated')" class="mt-0.5 space-y-1.5 pb-1">
          <article
            v-for="asset in sectionedSources.generated"
            :key="asset.id"
            class="relative rounded-md border px-2 py-2 transition-colors"
            :class="
              asset.id === openAssetId
                ? 'border-[#3B1770] bg-[#F5F1FC]'
                : isSelected(asset.id)
                  ? 'border-[#D4C4EF] bg-[#FBF9FE]'
                  : 'border-[#E2E2E2] hover:border-[#D4C4EF] hover:bg-[#F8F6FC]'
            "
          >
            <div class="flex items-start gap-2">
              <input
                type="checkbox"
                class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-[#C4C4C4] text-[#3B1770] focus:ring-[#3B1770]"
                :checked="isSelected(asset.id)"
                :aria-label="`Select ${asset.name}`"
                @click.stop
                @change="toggleSelect(asset.id)"
              />

              <button type="button" class="min-w-0 flex-1 text-left" @click="onOpen(asset.id)">
                <span class="flex items-start gap-2">
                  <img
                    v-if="asset.connector"
                    :src="CONNECTOR_ICONS[asset.connector]"
                    alt=""
                    class="mt-0.5 h-4 w-4 flex-shrink-0 object-contain"
                  />
                  <span class="min-w-0 flex-1">
                    <template v-if="renamingId === asset.id">
                      <input
                        v-model="renameDraft"
                        type="text"
                        class="mb-1 h-7 w-full rounded border border-[#3B1770] bg-white px-1.5 text-[12px] font-medium text-[#25262E] outline-none"
                        @click.stop
                        @keydown.enter.prevent="commitRename"
                        @keydown.esc.prevent="cancelRename"
                        @blur="commitRename"
                      />
                    </template>
                    <span v-else class="block truncate text-[12px] font-medium text-[#25262E]">
                      {{ asset.name }}
                    </span>
                    <span class="mt-0.5 block truncate text-[11px] text-[#9A9A9A]">{{ asset.subtitle }}</span>
                    <span class="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        v-for="tag in asset.tags"
                        :key="tag"
                        class="rounded bg-[#F1F1F1] px-1.5 py-0.5 text-[10px] text-[#6B6B6B]"
                      >
                        {{ tag }}
                      </span>
                    </span>
                    <span class="mt-1.5 block text-[10px] text-[#C4C4C4]">
                      {{ asset.author }} · {{ formatAssetModifiedAt(asset.modifiedAt) }}
                    </span>
                  </span>
                </span>
              </button>

              <div data-asset-menu class="relative flex-shrink-0">
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded text-[#9A9A9A] transition-colors hover:bg-white hover:text-[#25262E]"
                  :aria-expanded="menuAssetId === asset.id"
                  aria-label="Artifact actions"
                  @click.stop="toggleMenu(asset.id)"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="19" cy="12" r="1.5" />
                  </svg>
                </button>

                <div
                  v-if="menuAssetId === asset.id"
                  class="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-md border border-[#E2E2E2] bg-white py-1 shadow-md"
                  role="menu"
                >
                  <button
                    v-for="action in SOURCE_MENU_ACTIONS"
                    :key="action"
                    type="button"
                    class="block w-full px-3 py-1.5 text-left text-[12px] text-[#25262E] hover:bg-[#F8F6FC]"
                    role="menuitem"
                    @click="onMenuAction"
                  >
                    {{ action }}
                  </button>
                  <div class="my-1 border-t border-[#E2E2E2]"></div>
                  <button
                    type="button"
                    class="block w-full px-3 py-1.5 text-left text-[12px] text-[#25262E] hover:bg-[#F8F6FC]"
                    role="menuitem"
                    @click="startRename(asset)"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    class="block w-full px-3 py-1.5 text-left text-[12px] text-[#B42318] hover:bg-[#F8F6FC]"
                    role="menuitem"
                    @click="deleteOne(asset.id)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </article>
          <p v-if="!sectionedSources.generated.length" class="px-1.5 py-1 text-[11px] leading-relaxed text-[#9A9A9A]">
            {{ sectionHelp('generated') }}
          </p>
        </div>
      </section>

      <p
        v-if="artifactCount && !hasAnyVisible"
        class="px-2 py-4 text-[12px] text-[#C4C4C4]"
      >
        No artifacts match your search.
      </p>
    </div>

    <div class="flex-shrink-0 border-t border-[#E2E2E2] px-3 py-2.5">
      <button
        type="button"
        class="h-9 w-full rounded-md text-[12px] font-medium transition-colors"
        :class="
          canPublish
            ? 'bg-[#3B1770] text-white hover:bg-[#2F1259]'
            : 'cursor-not-allowed bg-[#EFEFEF] text-[#C4C4C4]'
        "
        :disabled="!canPublish"
        @click="onPublish"
      >
        Publish Artifacts
      </button>
    </div>

    <!-- Import picker: inventory catalog for Q3 -->
    <div
      v-if="isImportOpen"
      class="absolute inset-0 z-30 flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-source-title"
    >
      <div class="flex flex-shrink-0 items-center justify-between border-b border-[#E2E2E2] px-4 py-2.5">
        <h2 id="import-source-title" class="text-sm font-medium text-[#25262E]">Import source</h2>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-[#6B6B6B] transition-colors hover:bg-[#F1F1F1]"
          aria-label="Close import"
          @click="closeImport"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <p class="flex-shrink-0 px-4 py-2 text-[11px] text-[#9A9A9A]">
        Choose an existing data source from inventory to add to this workspace.
      </p>

      <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <button
          v-for="source in IMPORTABLE_SOURCES"
          :key="source.id"
          type="button"
          class="mb-1.5 flex w-full items-start gap-2 rounded-md border border-[#E2E2E2] px-2 py-2 text-left transition-colors"
          :class="
            alreadyImportedNames.has(source.name)
              ? 'cursor-not-allowed opacity-50'
              : 'hover:border-[#D4C4EF] hover:bg-[#F8F6FC]'
          "
          :disabled="alreadyImportedNames.has(source.name)"
          @click="importSource(source.id)"
        >
          <img
            :src="CONNECTOR_ICONS[source.connector]"
            alt=""
            class="mt-0.5 h-4 w-4 flex-shrink-0 object-contain"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[12px] font-medium text-[#25262E]">{{ source.name }}</span>
            <span class="mt-0.5 block truncate text-[11px] text-[#9A9A9A]">{{ source.subtitle }}</span>
            <span class="mt-1.5 block text-[10px] text-[#C4C4C4]">
              {{ source.author }} · {{ formatAssetModifiedAt(source.modifiedAt) }}
              <template v-if="alreadyImportedNames.has(source.name)"> · already added</template>
            </span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
