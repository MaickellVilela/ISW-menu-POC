<script setup lang="ts">
import { ref } from 'vue';

interface WorkspaceItem {
  id: string;
  name: string;
  modifiedDate: string;
}

const workspaces = ref<WorkspaceItem[]>([
  { id: 'mkt', name: 'Marketing analytics', modifiedDate: 'Aug 4, 2026 8:12 AM' },
  { id: 'hc', name: 'Healthcare pipeline', modifiedDate: 'Aug 3, 2026 4:27 PM' },
  { id: 'sales', name: 'Sales forecasting', modifiedDate: 'Jul 28, 2026 11:05 AM' },
]);

/** Open menu for a row — illustrative only. */
const openMenuId = ref<string | null>(null);

function toggleMenu(id: string, event: Event) {
  event.preventDefault();
  event.stopPropagation();
  openMenuId.value = openMenuId.value === id ? null : id;
}

function closeMenu() {
  openMenuId.value = null;
}

function onIllustrativeAction(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  closeMenu();
}

function createWorkspace() {
  navigateTo('/workspace/new');
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-white" @click="closeMenu">
    <!-- Page title -->
    <div class="flex-shrink-0 border-b border-[#E2E2E2] px-6 pt-5 pb-3">
      <h1 class="text-2xl font-semibold text-[#25262E]">Workspaces</h1>
    </div>

    <!-- Toolbar: Create only -->
    <div class="flex flex-shrink-0 items-center justify-end px-6 py-3">
      <button
        type="button"
        class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C]"
        @click="createWorkspace"
      >
        Create
      </button>
    </div>

    <!-- Table -->
    <div class="min-h-0 flex-1 overflow-auto px-6 pb-6">
      <table class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-[#E2E2E2] text-[#6B6B6B]">
            <th class="h-10 w-[50%] px-3 font-medium">
              <span class="border-r border-[#E2E2E2] pr-3">Name</span>
            </th>
            <th class="h-10 w-[35%] px-3 font-medium">
              <span class="inline-flex items-center gap-1 border-r border-[#E2E2E2] pr-3">
                Modified Date
                <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </th>
            <th class="h-10 w-[15%] px-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="workspace in workspaces"
            :key="workspace.id"
            class="group h-10 border-b border-[#E2E2E2] transition-colors hover:bg-[#FAFAFA]"
          >
            <td class="h-10 px-3 py-0 align-middle">
              <NuxtLink
                :to="`/workspace/${workspace.id}`"
                class="font-medium text-[#25262E] hover:text-[#3B1770] hover:underline"
              >
                {{ workspace.name }}
              </NuxtLink>
            </td>
            <td class="h-10 px-3 py-0 align-middle text-[#25262E]">
              {{ workspace.modifiedDate }}
            </td>
            <td class="relative h-10 px-3 py-0 align-middle">
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded text-[#6B6B6B] transition-colors hover:bg-[#F1F1F1] hover:text-[#25262E]"
                :aria-expanded="openMenuId === workspace.id"
                aria-haspopup="menu"
                :aria-label="`Actions for ${workspace.name}`"
                @click="toggleMenu(workspace.id, $event)"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                </svg>
              </button>

              <div
                v-if="openMenuId === workspace.id"
                role="menu"
                class="absolute right-3 top-full z-10 mt-0.5 w-36 overflow-hidden rounded-md border border-[#E2E2E2] bg-white py-1 shadow-sm"
                @click.stop
              >
                <button
                  type="button"
                  role="menuitem"
                  class="block w-full px-3 py-2 text-left text-sm text-[#25262E] hover:bg-[#F8F6FC]"
                  @click="onIllustrativeAction"
                >
                  Rename
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="block w-full px-3 py-2 text-left text-sm text-[#B42318] hover:bg-[#F8F6FC]"
                  @click="onIllustrativeAction"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="workspaces.length === 0" class="py-16 text-center text-sm text-[#9A9A9A]">
        No workspaces yet. Create one to get started.
      </p>
    </div>
  </div>
</template>
