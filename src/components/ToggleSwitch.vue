<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="toggle-wrapper" :class="{ disabled }">
    <span v-if="$slots.default" class="toggle-label">
      <slot />
    </span>
    <input type="checkbox" v-model="model" :disabled="disabled" class="toggle-input" />
    <span class="toggle-slider"></span>
  </label>
</template>

<style scoped>
.toggle-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1em;
  cursor: pointer;
  user-select: none;
  width: 100%;
}

.toggle-wrapper.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 2.77em;
  height: 1.54em;
  background: var(--grid);
  border: 0.08em solid var(--grid-large);
  border-radius: 0.77em;
  transition:
    background 0.2s,
    border-color 0.2s;
  flex-shrink: 0;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 0.15em;
  left: 0.15em;
  width: 1.08em;
  height: 1.08em;
  background: var(--vertex);
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 0.08em 0.23em rgba(0, 0, 0, 0.15);
}

.toggle-input:checked + .toggle-slider {
  background: var(--blue-btn);
  border-color: var(--blue-btn);
}

.toggle-input:checked + .toggle-slider::after {
  transform: translateX(1.23em);
}

.toggle-label {
  color: var(--text);
  font-size: 1em;
}
</style>
