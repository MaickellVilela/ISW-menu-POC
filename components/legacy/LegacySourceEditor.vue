<script setup lang="ts">
import CertifiedQuestionsList from '~/components/workspace/CertifiedQuestionsList.vue';
import LegacyCanvasIllustration from './LegacyCanvasIllustration.vue';

type LegacyTab = 'source-creation' | 'certified-questions';

/** Legacy (Logi Composer) source editor chrome, with the new Certified Questions tab. */
const props = withDefaults(
  defineProps<{
    sourceId: string;
    sourceName: string;
    mode: 'preview' | 'edit';
    updating?: boolean;
    certifiedHighlightId?: string | null;
    tab: LegacyTab;
  }>(),
  { updating: false, certifiedHighlightId: null },
);

const emit = defineEmits<{
  'update:tab': [tab: LegacyTab];
  save: [];
}>();

const ICON_WARNING =
  'M12.8659 3.00017L22.3922 19.5002C22.6684 19.9785 22.5045 20.5901 22.0262 20.8662C21.8742 20.954 21.7017 21.0002 21.5262 21.0002H2.47363C1.92135 21.0002 1.47363 20.5525 1.47363 20.0002C1.47363 19.8246 1.51984 19.6522 1.60761 19.5002L11.1339 3.00017C11.41 2.52187 12.0216 2.358 12.4999 2.63414C12.6519 2.72191 12.7782 2.84815 12.8659 3.00017ZM10.9999 16.0002V18.0002H12.9999V16.0002H10.9999ZM10.9999 9.00017V14.0002H12.9999V9.00017H10.9999Z';
const ICON_EYE =
  'M12.0003 3C17.3924 3 21.8784 6.87976 22.8189 12C21.8784 17.1202 17.3924 21 12.0003 21C6.60812 21 2.12215 17.1202 1.18164 12C2.12215 6.87976 6.60812 3 12.0003 3ZM12.0003 19C16.2359 19 19.8603 16.052 20.7777 12C19.8603 7.94803 16.2359 5 12.0003 5C7.7646 5 4.14022 7.94803 3.22278 12C4.14022 16.052 7.7646 19 12.0003 19ZM12.0003 16.5C9.51498 16.5 7.50026 14.4853 7.50026 12C7.50026 9.51472 9.51498 7.5 12.0003 7.5C14.4855 7.5 16.5003 9.51472 16.5003 12C16.5003 14.4853 14.4855 16.5 12.0003 16.5ZM12.0003 14.5C13.381 14.5 14.5003 13.3807 14.5003 12C14.5003 10.6193 13.381 9.5 12.0003 9.5C10.6196 9.5 9.50026 10.6193 9.50026 12C9.50026 13.3807 10.6196 14.5 12.0003 14.5Z';
const ICON_EDIT =
  'M16.7574 2.99666L14.7574 4.99666H5V18.9967H19V9.2393L21 7.2393V19.9967C21 20.5489 20.5523 20.9967 20 20.9967H4C3.44772 20.9967 3 20.5489 3 19.9967V3.99666C3 3.44438 3.44772 2.99666 4 2.99666H16.7574ZM20.4853 2.09717L21.8995 3.51138L12.7071 12.7038L11.2954 12.7062L11.2929 11.2896L20.4853 2.09717Z';
const ICON_INFO =
  'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z';
const ICON_CACHE =
  'M5.46257 4.43262C7.21556 2.91688 9.5007 2 12 2C17.5228 2 22 6.47715 22 12C22 14.1361 21.3302 16.1158 20.1892 17.7406L17 12H20C20 7.58172 16.4183 4 12 4C9.84982 4 7.89777 4.84827 6.46023 6.22842L5.46257 4.43262ZM18.5374 19.5674C16.7844 21.0831 14.4993 22 12 22C6.47715 22 2 17.5228 2 12C2 9.86386 2.66979 7.88416 3.8108 6.25944L7 12H4C4 16.4183 7.58172 20 12 20C14.1502 20 16.1022 19.1517 17.5398 17.7716L18.5374 19.5674Z';
const ICON_SETTINGS =
  'M21 18V21H19V18H17V15H23V18H21ZM5 18V21H3V18H1V15H7V18H5ZM11 6V3H13V6H15V9H9V6H11ZM11 11H13V21H11V11ZM3 13V3H5V13H3ZM19 13V3H21V13H19Z';
const ICON_SHIELD = 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z';
const ICON_SHIELD_CHECK = 'M9 12l2 2 4-4';

function selectTab(next: LegacyTab): void {
  if (next !== props.tab) emit('update:tab', next);
}
</script>

<template>
  <div class="legacy-ui flex min-h-0 flex-1 flex-col bg-white">
    <div class="lg-chrome lg-head">
      <div class="lg-banner" role="note">
        <span class="bp3-icon lg-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_WARNING" /></svg>
        </span>
        Avoid conflicts: save manual changes before prompting the agent, and allow it to finish the task before editing again.
      </div>

      <div class="lg-topbar">
        <ul class="bp3-breadcrumbs">
          <li class="lg-crumb">
            <span class="bp3-breadcrumb lg-crumb-link">Sources</span>
          </li>
          <li class="lg-crumb">
            <span class="bp3-breadcrumb bp3-breadcrumb-current">
              <span class="bp3-editable-text" :title="sourceName">
                <span class="bp3-editable-text-content">{{ sourceName }}</span>
              </span>
            </span>
          </li>
        </ul>
        <div class="lg-topbar-actions">
          <span class="bp3-button bp3-minimal bp3-small lg-inert" title="Preview Source" aria-hidden="true">
            <span class="bp3-icon lg-topbar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_EYE" /></svg>
            </span>
          </span>
          <span class="bp3-button bp3-minimal bp3-small lg-inert" title="Source Definition" aria-hidden="true">
            <span class="bp3-icon lg-topbar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24"><path :d="ICON_EDIT" /></svg>
            </span>
          </span>
          <button
            type="button"
            class="bp3-button bp3-intent-primary lg-save"
            :class="{ 'bp3-disabled': mode !== 'edit' }"
            :disabled="mode !== 'edit'"
            @click="emit('save')"
          >
            <span class="bp3-button-text">Save Source</span>
          </button>
        </div>
      </div>

      <div class="lg-tabs">
        <div class="bp3-tab-list" role="tablist" aria-label="Source editor">
          <div
            class="bp3-tab"
            role="tab"
            aria-disabled="false"
            :aria-selected="tab === 'source-creation'"
            tabindex="0"
            @click="selectTab('source-creation')"
            @keydown.enter.prevent="selectTab('source-creation')"
            @keydown.space.prevent="selectTab('source-creation')"
          >
            <span class="lg-tab-inner">
              <span class="bp3-icon lg-tab-icon">
                <svg width="28.75" height="28.75" viewBox="0 0 24 24"><path :d="ICON_INFO" /></svg>
              </span>
              <span>Source Creation</span>
            </span>
          </div>
          <div class="bp3-tab lg-inert" role="tab" aria-disabled="false" aria-selected="false" tabindex="-1">
            <span class="lg-tab-inner">
              <span class="bp3-icon lg-tab-icon">
                <svg width="28.75" height="28.75" viewBox="0 0 24 24"><path :d="ICON_CACHE" /></svg>
              </span>
              <span>Cache</span>
            </span>
          </div>
          <div class="bp3-tab lg-inert" role="tab" aria-disabled="false" aria-selected="false" tabindex="-1">
            <span class="lg-tab-inner">
              <span class="bp3-icon lg-tab-icon">
                <svg width="28.75" height="28.75" viewBox="0 0 24 24"><path :d="ICON_SETTINGS" /></svg>
              </span>
              <span>Global Settings</span>
            </span>
          </div>
          <div
            class="bp3-tab"
            role="tab"
            aria-disabled="false"
            :aria-selected="tab === 'certified-questions'"
            tabindex="0"
            @click="selectTab('certified-questions')"
            @keydown.enter.prevent="selectTab('certified-questions')"
            @keydown.space.prevent="selectTab('certified-questions')"
          >
            <span class="lg-tab-inner">
              <span class="bp3-icon lg-tab-icon">
                <svg
                  width="28.75"
                  height="28.75"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path :d="ICON_SHIELD" />
                  <path :d="ICON_SHIELD_CHECK" />
                </svg>
              </span>
              <span>Certified Questions</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="tab === 'source-creation'" role="tabpanel" class="flex min-h-0 flex-1 flex-col">
      <LegacyCanvasIllustration :updating="updating" />
    </div>
    <div v-else-if="tab === 'certified-questions'" role="tabpanel" class="flex min-h-0 flex-1 flex-col">
      <CertifiedQuestionsList
        :key="sourceId"
        :source-id="sourceId"
        :source-name="sourceName"
        :highlight-id="certifiedHighlightId"
      />
    </div>
  </div>
</template>

<style src="./legacy-ui.css"></style>
