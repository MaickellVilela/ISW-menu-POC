<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import {
  canConfirmPublish,
  hasPublishNameConflict,
  initialPublishDrafts,
  isBlankPublishName,
  type PublishNameDraft,
} from '~/composables/usePublish';
import type { WorkspaceAsset } from '~/composables/useWorkspaceAssets';

const props = defineProps<{
  open: boolean;
  sources: WorkspaceAsset[];
  publishedNames: string[];
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [drafts: PublishNameDraft[]];
}>();

const drafts = ref<PublishNameDraft[]>([]);

function onEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('cancel');
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      drafts.value = initialPublishDrafts(props.sources, props.publishedNames);
    }
    if (typeof window === 'undefined') return;
    if (open) window.addEventListener('keydown', onEscape);
    else window.removeEventListener('keydown', onEscape);
  },
);

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onEscape);
});

const sourceById = computed(() => new Map(props.sources.map((source) => [source.id, source])));

const canPublish = computed(() => canConfirmPublish(drafts.value, props.publishedNames));

const publishLabel = computed(() => {
  const count = drafts.value.length;
  return count === 1 ? 'Publish 1 data source' : `Publish ${count} data sources`;
});

function sourceFor(draft: PublishNameDraft): WorkspaceAsset | undefined {
  return sourceById.value.get(draft.assetId);
}

function connectorIconFor(draft: PublishNameDraft): string | null {
  const connector = sourceFor(draft)?.connector;
  return connector ? CONNECTOR_ICONS[connector] : null;
}

function originalName(draft: PublishNameDraft): string {
  return draft.originalName;
}

function isConflict(draft: PublishNameDraft): boolean {
  return hasPublishNameConflict(draft, drafts.value, props.publishedNames);
}

function wasAdjusted(draft: PublishNameDraft): boolean {
  return originalName(draft).trim().toLowerCase() !== draft.name.trim().toLowerCase();
}

function onConfirm(): void {
  if (!canPublish.value) return;
  emit('confirm', drafts.value.map((draft) => ({ ...draft, name: draft.name.trim() })));
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-dialog-title"
    >
      <div class="flex w-full max-w-[440px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div class="px-6 pt-5 pb-4">
          <h2 id="publish-dialog-title" class="text-base font-semibold text-[#25262E]">
            Publish to Data Sources
          </h2>
          <p class="mt-2 text-sm leading-6 text-[#6B6B6B]">
            Publishing creates an independent copy in Data Sources. This workspace stays a sandbox — edits here don't update copies, and publishing again adds another copy.
          </p>
        </div>

        <div class="max-h-[min(20rem,50vh)] overflow-y-auto border-t border-[#E2E2E2] px-6 py-3">
          <p class="mb-2 text-[11px] font-medium text-[#9A9A9A]">Name in Data Sources</p>
          <ul class="space-y-3">
            <li v-for="draft in drafts" :key="draft.assetId">
              <label class="block text-sm font-medium text-[#25262E]" :for="`publish-name-${draft.assetId}`">
                <span class="flex items-center gap-2">
                  <img
                    v-if="connectorIconFor(draft)"
                    :src="connectorIconFor(draft)!"
                    alt=""
                    class="h-4 w-4 flex-shrink-0 object-contain"
                  />
                  <span class="truncate">{{ originalName(draft) }}</span>
                </span>
              </label>
              <input
                :id="`publish-name-${draft.assetId}`"
                v-model="draft.name"
                type="text"
                class="mt-1.5 h-9 w-full rounded-md border bg-white px-2.5 text-sm text-[#25262E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-1"
                :class="isConflict(draft) || isBlankPublishName(draft.name) ? 'border-[#B42318]' : 'border-[#E2E2E2] focus:border-[#3B1770]'"
                :aria-invalid="isConflict(draft) || isBlankPublishName(draft.name) ? 'true' : 'false'"
                :aria-describedby="isConflict(draft) || isBlankPublishName(draft.name) ? `publish-name-help-${draft.assetId}` : undefined"
              />
              <p
                v-if="isBlankPublishName(draft.name)"
                :id="`publish-name-help-${draft.assetId}`"
                class="mt-1 text-xs text-[#B42318]"
              >
                Enter a name for this copy.
              </p>
              <p
                v-else-if="isConflict(draft)"
                :id="`publish-name-help-${draft.assetId}`"
                class="mt-1 text-xs text-[#B42318]"
              >
                A data source with this name already exists. Choose a unique name.
              </p>
              <p
                v-else-if="wasAdjusted(draft)"
                class="mt-1 text-xs text-[#6B6B6B]"
              >
                Renamed to avoid a conflict with Data Sources.
              </p>
            </li>
          </ul>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E2E2E2] px-6 py-3">
          <button
            type="button"
            class="h-9 rounded-md px-3 text-sm font-medium text-[#3B1770] transition-colors hover:bg-[#F5F1FC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-2"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="h-9 rounded-md bg-[#3B1770] px-4 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#3B1770]/40 disabled:hover:bg-[#3B1770]/40"
            :disabled="!canPublish"
            @click="onConfirm"
          >
            {{ publishLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
