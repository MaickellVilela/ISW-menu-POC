<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

import MenuItem from './MenuItem.vue';
import DashboardIcon from '~/assets/images/dashboard-fill.svg';
import HideLeftSideBarIcon from '~/assets/images/hide-left-side-bar-fill.svg';
import ArrowLeftIcon from '~/assets/images/arrow-left-s-line.svg';
import SearchIcon from '~/assets/images/search-line.svg';
import HomeIcon from '~/assets/images/home-5-fill.svg';
import AllContentIcon from '~/assets/images/archive-stack-fill.svg';
import ProjectsIcon from '~/assets/images/briefcase-fill.svg';
import ViewsIcon from '~/assets/images/artboard-fill.svg';
import DataIcon from '~/assets/images/database-2-fill.svg';
import BusinessIcon from '~/assets/images/pie-chart-2-fill.svg';
import AdminIcon from '~/assets/images/tree-node.svg';
import HelpIcon from '~/assets/images/question-line.svg';
import AvatarIcon from '~/assets/images/Avatar.svg';

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
  { name: 'Home', icon: HomeIcon, active: true },
  { name: 'All Content', icon: AllContentIcon },
  { name: 'Projects', icon: ProjectsIcon },
  { name: 'Views', icon: ViewsIcon },
  { name: 'Data', icon: DataIcon },
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
        class="relative flex flex-col h-screen text-white bg-[#2C2C2C] transition-all duration-300 ease-in-out"
        :class="[isCollapsed ? 'w-[60px] items-center' : 'w-64', isCollapsed ? 'cursor-e-resize' : 'cursor-default']"
    >
        <!-- Header -->
        <div class="flex items-center p-3 bg-[#8A2BE2] w-full relative"
            :class="[isCollapsed ? 'cursor-e-resize' : 'cursor-default']"
            @click="isCollapsed ? openMenu() : null">
            <div class="flex items-center overflow-hidden">
                <img :src="DashboardIcon" class="w-6 h-6 flex-shrink-0" />
                <span class="font-bold whitespace-nowrap transition-all duration-200" :class="[isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-auto ml-2']">Managed</span>
            </div>
            <button v-if="!isCollapsed" class="absolute right-2 cursor-pointer" @click.stop="closeMenu">
                <img :src="HideLeftSideBarIcon" class="w-6 h-6" />
            </button>
            <button v-else class="absolute -right-[4px] cursor-e-resize" @click.stop="openMenu">
                <img :src="ArrowLeftIcon" class="w-6 h-6 transition-transform duration-300" />
            </button>
        </div>

        <!-- Search -->
        <div class="w-full px-3 py-2" @click.stop>
            <div
                class="flex items-center rounded-md"
                :class="{ 'bg-[#3a3a3a]': !isCollapsed }"
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
