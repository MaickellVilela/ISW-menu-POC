<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

import MenuItem from './MenuItem.vue';
import SimbaLogo from '~/assets/images/simba-logo.svg';
import HideLeftSideBarIcon from '~/assets/images/hide-left-side-bar-fill.svg';
import ArrowLeftIcon from '~/assets/images/arrow-left-s-line.svg';
import SearchIcon from '~/assets/images/search-line.svg';
import HomeIcon from '~/assets/images/home-5-fill.svg';
import AllContentIcon from '~/assets/images/archive-stack-fill.svg';
import ProjectsIcon from '~/assets/images/briefcase-fill.svg';
import ViewsIcon from '~/assets/images/artboard-fill.svg';
import WorkspaceIcon from '~/assets/images/workspace-fill.svg';
import DataIcon from '~/assets/images/database-2-fill.svg';
import BusinessIcon from '~/assets/images/pie-chart-2-fill.svg';
import AdminIcon from '~/assets/images/tree-node.svg';
import HelpIcon from '~/assets/images/question-line.svg';
import AvatarIcon from '~/assets/images/Avatar.svg';

/** Full wordmark at h-7 (28px); symbol is the first 25/125 of that width. */
const LOGO_HEIGHT_PX = 28;
const LOGO_FULL_WIDTH_PX = (125 / 36) * LOGO_HEIGHT_PX;
const LOGO_SYMBOL_WIDTH_PX = (25 / 36) * LOGO_HEIGHT_PX;
/** Matches MenuItem: (w-8 - icon) / 2 so the mark lines up with nav icons. */
const LOGO_ICON_COLUMN_INSET_PX = (32 - LOGO_SYMBOL_WIDTH_PX) / 2;

const isCollapsed = ref(true);
const searchInput = ref<HTMLInputElement | null>(null);

const emit = defineEmits(['update:collapsed']);

function openMenu() {
  isCollapsed.value = false;
}

function closeMenu() {
  isCollapsed.value = true;
}

function openMenuAndFocusSearch() {
  openMenu();
  nextTick(() => {
    searchInput.value?.focus();
  });
}

watch(isCollapsed, (newValue) => {
    emit('update:collapsed', newValue);
});

const menuItems = [
  { name: 'Home', icon: HomeIcon, route: '/' },
  { name: 'Workspaces', icon: WorkspaceIcon, route: '/workspace' },
  { name: 'All Content', icon: AllContentIcon },
  { name: 'Projects', icon: ProjectsIcon },
  { name: 'Views', icon: ViewsIcon },
  { name: 'Data Sources', icon: DataIcon, route: '/data-sources' },
  { name: 'Business', icon: BusinessIcon },
];

const bottomMenuItems = [
    { name: 'Administration', icon: AdminIcon },
    { name: 'Help', icon: HelpIcon },
    { name: 'John Doe', icon: AvatarIcon, isAvatar: true },
];

</script>

<template>
    <aside
        class="relative flex flex-col h-screen text-white bg-[#25262E] transition-all duration-300 ease-in-out"
        :class="[isCollapsed ? 'w-14 items-center' : 'w-64', isCollapsed ? 'cursor-e-resize' : 'cursor-default']"
    >
        <!-- 4px brand edge between menu and main content (Violet Bloom) -->
        <div
            class="pointer-events-none absolute inset-y-0 right-0 z-10 w-1"
            style="background: linear-gradient(214deg, rgb(134 61 255) 0%, rgb(255 125 197) 100%)"
            aria-hidden="true"
        ></div>

        <!-- Header: one logo, clipped — expands right only so left edge never shifts -->
        <div
            class="relative flex w-full items-center px-3 py-3"
            :class="[isCollapsed ? 'cursor-e-resize' : 'cursor-default']"
            @click="isCollapsed ? openMenu() : null"
        >
            <div class="flex min-w-0 flex-1 items-center overflow-hidden">
                <div
                    class="overflow-hidden transition-[width] duration-300 ease-in-out"
                    :style="{
                        width: `${isCollapsed ? LOGO_SYMBOL_WIDTH_PX : LOGO_FULL_WIDTH_PX}px`,
                        marginLeft: `${LOGO_ICON_COLUMN_INSET_PX}px`,
                    }"
                >
                    <img
                        :src="SimbaLogo"
                        alt="Simba"
                        class="max-w-none"
                        :style="{ height: `${LOGO_HEIGHT_PX}px`, width: `${LOGO_FULL_WIDTH_PX}px` }"
                    />
                </div>
            </div>
            <button
                v-if="!isCollapsed"
                type="button"
                class="ml-2 flex-shrink-0 cursor-w-resize"
                aria-label="Collapse menu"
                @click.stop="closeMenu"
            >
                <img :src="HideLeftSideBarIcon" class="h-6 w-6" alt="" />
            </button>
            <button
                v-else
                type="button"
                class="absolute -right-[4px] cursor-e-resize"
                aria-label="Expand menu"
                @click.stop="openMenu"
            >
                <img :src="ArrowLeftIcon" class="h-6 w-6 transition-transform duration-300" alt="" />
            </button>
        </div>

        <!-- Search -->
        <div class="w-full px-3 py-2" @click.stop>
            <div
                class="flex items-center rounded-md"
                :class="{ 'bg-[#181818] border border-[#454545]': !isCollapsed }"
            >
                <div class="flex items-center justify-center w-8 h-8 flex-shrink-0 cursor-pointer" @click="isCollapsed ? openMenuAndFocusSearch() : null">
                    <img :src="SearchIcon" class="w-4 h-4" />
                </div>
                <input
                    ref="searchInput"
                    type="text"
                    class="text-white bg-transparent focus:outline-none transition-all duration-200"
                    :class="{
                        'w-0 opacity-0': isCollapsed,
                        'w-full pl-2 opacity-100': !isCollapsed
                    }"
                    placeholder="Search"
                    :disabled="isCollapsed"
                />
            </div>
        </div>

        <!-- Menu Items -->
        <nav class="w-full" @click.stop>
            <ul>
                <MenuItem v-for="item in menuItems" :key="item.name" :item="item" :is-collapsed="isCollapsed" />
            </ul>
        </nav>

        <div class="flex-1 h-full w-full" @click.stop="[isCollapsed ? openMenu() : null]"></div>

        <!-- Bottom Menu Items -->
        <div @click.stop class="w-full">
            <ul>
                <MenuItem v-for="item in bottomMenuItems" :key="item.name" :item="item" :is-collapsed="isCollapsed" />
            </ul>
        </div>
    </aside>
</template>
