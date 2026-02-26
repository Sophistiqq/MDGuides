<script lang="ts">
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
  let menuElement = $state<HTMLDivElement>();

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

  function cancelRename() {
    showRenameModal = false;
  }

  function handleDelete() {
    ondelete(folderName);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (showRenameModal) {
        cancelRename();
      } else {
        onclose();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  bind:this={menuElement}
  class="context-menu"
  style="left: {adjustedPosition().x}px; top: {adjustedPosition().y}px;"
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => e.key === 'Escape' && onclose()}
  role="menu"
  tabindex="-1"
>
  <button
    class="menu-item"
    onclick={handleRename}
    type="button"
    role="menuitem"
  >
    ✏️ Rename
  </button>

  <div class="divider"></div>

  <button
    class="menu-item danger"
    onclick={handleDelete}
    type="button"
    role="menuitem"
  >
    🗑️ Delete
  </button>
</div>

{#if showRenameModal}
  <div 
    class="modal-overlay" 
    onclick={cancelRename} 
    onkeydown={(e) => e.key === 'Escape' && cancelRename()}
    role="presentation"
  >
    <div 
      class="modal" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="rename-folder-title"
      tabindex="-1"
    >
      <h3 id="rename-folder-title">Rename Folder</h3>
      <input
        class="folder-input"
        placeholder="New folder name"
        bind:value={newFolderName}
        onkeydown={(e) => e.key === 'Enter' && confirmRename()}
      />
      <div class="modal-actions">
        <button class="btn-secondary" onclick={cancelRename}>Cancel</button>
        <button 
          class="btn-primary" 
          onclick={confirmRename} 
          disabled={!newFolderName.trim() || newFolderName === folderName}
        >
          Rename
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    padding: 0.375rem;
    min-width: 180px;
    z-index: 2000;
  }

  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-align: left;
    padding: 0.625rem 0.875rem;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #374151;
    transition: background-color 0.15s;
  }

  .menu-item:hover {
    background: #f3f4f6;
  }

  .menu-item.danger:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  .divider {
    height: 1px;
    background: #e5e7eb;
    margin: 0.375rem 0;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
  }

  .modal {
    background: #ffffff;
    border-radius: 0.5rem;
    padding: 1.5rem;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }

  .modal h3 {
    margin: 0 0 1rem;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .folder-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .folder-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #d1d5db;
  }
</style>