<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal" :style="modalStyle">
          <h3 v-if="title" class="modal-title">{{ title }}</h3>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, type StyleValue } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  title: String,
  width: String,
  maxWidth: String,
  maxHeight: String,
  minHeight: String,
})

const emit = defineEmits(['update:modelValue'])

const close = () => emit('update:modelValue', false)

const modalStyle = computed<StyleValue>(() => {
  const style: Record<string, string> = {}

  if (props.width) style.width = props.width
  if (props.maxWidth) style.maxWidth = props.maxWidth
  if (props.maxHeight) style.maxHeight = props.maxHeight
  if (props.minHeight) style.minHeight = props.minHeight

  return style
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.modal {
  background: var(--header-bg);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  margin: 15px;
  max-height: calc(100vh - 30px);
  max-width: calc(100vw - 30px);
}

.modal-title {
  margin: 0;
  font-size: 16px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-footer :slotted(button) {
  padding: 8px 16px;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}

.modal-footer :slotted(button:hover) {
  background: var(--grid);
}

.modal-footer :slotted(.primary-btn) {
  background: var(--vertex-selected);
  border-color: var(--vertex-selected);
  color: white;
}

.modal-footer :slotted(.primary-btn:hover) {
  background: var(--blue-btn);
  border-color: var(--blue-btn);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.modal-enter-from .modal {
  opacity: 0;
  transform: scale(0.9);
}

.modal-leave-to .modal {
  opacity: 0;
  transform: scale(0.9);
}
</style>
