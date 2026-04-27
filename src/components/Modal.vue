<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal">
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

<script setup>
defineProps({
  modelValue: Boolean,
  title: String,
})

const emit = defineEmits(['update:modelValue'])

const close = () => emit('update:modelValue', false)
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
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}

.modal-title {
  margin: 0;
  font-size: 16px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-footer button {
  padding: 8px 16px;
  border: 1px solid var(--grid-large);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}

.modal-footer button:hover {
  background: var(--grid);
}

.modal-footer .primary-btn {
  background: var(--vertex-selected);
  border-color: var(--vertex-selected);
  color: white;
}

.modal-footer .primary-btn:hover {
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
