<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getPluginStorage, setPluginStorage } from '../../utils/caidoUtils';
const isShiftCoreEnlarged = ref(false);
const isShiftMemoryEnlarged = ref(false);

// Define props
const props = defineProps<{
  caido: Caido // Should be properly typed as Caido
}>();

onMounted(async () => {
  // Set hasSeenTutorial to true when component mounts
  const storage = await getPluginStorage(props.caido);
  storage.hasSeenTutorial = true;
  await setPluginStorage(props.caido, storage);
});
</script>

<template>
  <div class="shift-ui-container">
    <div class="h-full flex flex-col gap-1">
      <div class="w-full h-1/2 flex gap-4">
        <div class="w-1/2 flex flex-col justify-center gap-4">
          <h1 class="custom-font text-4xl text-center">Shift Core</h1>
          <p class="text-lg text-center">Shift is a quick and easy way to query AI within Caido.<br>Shift can take actions for you like creating M&R rules, modifying the HTTQL bar, and much more.</p>
          <img 
            :class="{ 'enlarged-core': isShiftCoreEnlarged }"
            src="../../assets/ShiftIntro.svg" 
            alt="Shift Introduction"
            @click="isShiftCoreEnlarged = !isShiftCoreEnlarged"
            @contextmenu.prevent="isShiftCoreEnlarged = !isShiftCoreEnlarged"
          />
        </div>
        <div class="w-1/2 flex flex-col justify-center gap-4">
          <h1 class="custom-font text-4xl text-center">Shift Memory</h1>
          <p class="text-lg text-center">Shift Memory is a way to store and retrieve information from the current session.<br>This is useful for things like keeping track of IDs, API Keys, or other info that you want to keep around for a bit.</p>
          <img 
            :class="{ 'enlarged-memory': isShiftMemoryEnlarged }"
            src="../../assets/ShiftMemoryIntro.svg" 
            alt="Shift Memory Introduction"
            @click="isShiftMemoryEnlarged = !isShiftMemoryEnlarged"
            @contextmenu.prevent="isShiftMemoryEnlarged = !isShiftMemoryEnlarged"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Excalifont';
  src: url('https://excalidraw.nyc3.cdn.digitaloceanspaces.com/fonts/Excalifont-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

.custom-font {
  font-family: 'Excalifont', sans-serif;
}

img {
  border: 1px solid var(--c-border-default);
  border-radius: 2rem;
  transition: transform 0.3s ease;
  cursor: pointer;
}

.enlarged-core {
  transform: scale(1.4) translate(15%, 15%);
  z-index: 9999;
}
.enlarged-memory {
  transform: scale(1.4) translate(-15%, 15%);
  z-index: 9999;
}

.shift-ui-container {

  font-family: Arial, sans-serif;
  margin: 0;
  height: calc(100vh - 200px);
  overflow-y: auto;
  scrollbar-width: thin;
}

.shift-ui-container::-webkit-scrollbar {
  width: 8px;
}

</style>