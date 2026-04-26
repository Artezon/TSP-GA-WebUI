<script setup lang="ts">
import { type Mode, MODES } from '../state/ui'

const props = defineProps<{ activeMode: Mode }>()
const emit = defineEmits<{
  setMode: [mode: Mode]
  clearAll: []
}>()
</script>

<template>
  <header>
    <div class="toolbar">
      <div class="mode-group">
        <button
          v-for="mode in MODES"
          :key="mode.value"
          :class="{ active: props.activeMode === mode.value }"
          @click="emit('setMode', mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>
      <div class="separator" />
      <div class="action-group">
        <button @click="emit('clearAll')">Clear All</button>
        <button>Random Graph</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
header {
  background: var(--header-bg);
  border-bottom: 1px solid var(--grid-large);
  flex-shrink: 0;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}
.mode-group,
.action-group {
  display: flex;
  gap: 4px;
}
button {
  padding: 6px 12px;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  transition: background 0.15s;
}
button:hover {
  background: var(--grid);
}
button.active {
  background: var(--vertex-selected);
  border-color: var(--vertex-selected);
  color: white;
}
.separator {
  width: 1px;
  height: 24px;
  background: var(--grid-large);
  margin: 0 4px;
}
</style>
