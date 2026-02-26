<script lang="ts">
  import Dialog from './Dialog.svelte';

  type Props = {
    x: number;
    y: number;
    folderName: string;
    onrename: (oldName: string, newName: string) => void;
    ondelete: (folderName: string) => void;
    onclose: () => void;
  };

  let { x, y, folderName, onrename, ondelete, onclose }: Props = $props();

  let showRenameModal = $state(false);
  let newFolderName = $state('');
  let menuElement = $state<HTMLElement>();

  $effect(() => {
    if (showRenameModal) {
      newFolderName = folderName;
    }
  });

  // Adjust position if menu would go off-screen
  const adjustedPosition = $derived(() => {
    if (!menuElement) return { x, y };

    const rect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    if (y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    return { x: adjustedX, y: adjustedY };
  });

  function handleRename() {
    newFolderName = folderName;
    showRenameModal = true;
  }

  function confirmRename() {
    if (newFolderName.trim() && newFolderName !== folderName) {
      onrename(folderName, newFolderName.trim());
    }
    showRenameModal = false;
    onclose();
  }

  function handleDelete() {
    ondelete(folderName);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (!showRenameModal) {
        onclose();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  bind:this={menuElement}
  class="fixed z-[2000] min-w-[180px]"
  style="left: {adjustedPosition().x}px; top: {adjustedPosition().y}px;"
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
    }
  }}
  role="menu"
  tabindex="-1"
>
  <ul class="menu bg-base-100 rounded-box shadow-2xl border border-base-300 p-1 w-full">
    <li>
      <button onclick={handleRename} class="py-2 px-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        Rename Folder
      </button>
    </li>
    
    <div class="divider my-1"></div>
    
    <li>
      <button onclick={handleDelete} class="text-error hover:bg-error/10 py-2 px-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        Delete Folder
      </button>
    </li>
  </ul>
</div>

<Dialog
  bind:open={showRenameModal}
  title="Rename Folder"
  confirmText="Rename"
  onConfirm={confirmRename}
>
  <div class="form-control w-full">
    <label class="label" for="rename-folder">
      <span class="label-text">New Folder Name</span>
    </label>
    <input
      id="rename-folder"
      type="text"
      placeholder="Enter new name"
      class="input input-bordered w-full"
      bind:value={newFolderName}
      onkeydown={(e) => e.key === 'Enter' && confirmRename()}
    />
  </div>
</Dialog>
