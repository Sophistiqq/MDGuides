<script lang="ts">
  let { open = $bindable(false), title, children, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' } = $props();

  function close() {
    open = false;
  }

  function handleConfirm() {
    onConfirm?.();
    close();
  }
</script>

{#if open}
  <dialog class="modal modal-open">
    <div class="modal-box border border-base-300 shadow-2xl">
      {#if title}
        <h3 class="font-bold text-lg mb-4">{title}</h3>
      {/if}
      <div class="py-4">
        {@render children?.()}
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost" onclick={close}>{cancelText}</button>
        <button class="btn btn-primary" onclick={handleConfirm}>{confirmText}</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button onclick={close}>close</button>
    </form>
  </dialog>
{/if}
