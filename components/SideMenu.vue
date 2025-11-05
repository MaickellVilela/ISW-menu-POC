<script setup lang="ts">
import { ref, watch } from 'vue';

import MenuItem from './MenuItem.vue';
import DashboardIcon from '~/assets/images/dashboard-fill.svg';
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

const emit = defineEmits(['update:collapsed']);

function toggleMenu() {
  isCollapsed.value = !isCollapsed.value;
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
        :class="[isCollapsed ? 'w-[60px] items-center' : 'w-64', isCollapsed ? 'cursor-pointer' : 'cursor-default']"
        @click="isCollapsed ? toggleMenu() : null"
    >
        <!-- Header -->
        <div class="flex items-center p-2 bg-[#8A2BE2] w-full relative" :class="[isCollapsed ? 'justify-center' : 'justify-between']" @click.stop>
            <div class="flex items-center overflow-hidden">
                <img :src="DashboardIcon" class="w-6 h-6 flex-shrink-0" />
                <span class="font-bold whitespace-nowrap transition-all duration-200" :class="[isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-auto ml-2']">Managed</span>
            </div>
            <button class="cursor-pointer absolute right-0" :class="[isCollapsed ? 'right-0' : 'right-2']" @click="toggleMenu">
                <img :src="ArrowLeftIcon" class="w-6 h-6 transition-transform duration-300" :class="[isCollapsed ? 'rotate-0' : 'rotate-180']" />
            </button>
        </div>

        <!-- Search -->
        <div class="relative p-2 mt-4 w-full" @click.stop v-show="!isCollapsed">
            <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <img :src="SearchIcon" class="w-5 h-5" />
            </div>
            <input
                type="text"
                class="w-full py-2 pl-10 pr-4 text-white bg-[#3a3a3a] rounded-md focus:outline-none"
                placeholder="Search"
            />
        </div>

        <!-- Menu Items -->
        <nav class="flex-1 mt-6 w-full" @click.stop>
            <ul>
                <MenuItem v-for="item in menuItems" :key="item.name" :item="item" :is-collapsed="isCollapsed" />
            </ul>
        </nav>

        <!-- Bottom Menu Items -->
        <div @click.stop class="w-full">
            <ul>
                <MenuItem v-for="item in bottomMenuItems" :key="item.name" :item="item" :is-collapsed="isCollapsed" />
            </ul>
        </div>
    </aside>
</template>
