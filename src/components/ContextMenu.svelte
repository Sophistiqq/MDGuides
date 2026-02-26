<script lang="ts">
  import type { Folder } from '../lib/opfs';

  type Props = {
    x: number;
    y: number;
    folders: Folder[];
    onmove: (targetFolder: string) => void;
    ondelete: () => void;
    onclose: () => void;
  };

  let { x, y, folders, onmove, ondelete, onclose }: Props = $props();

  let showFolderSubmenu = $state(false);
  let menuElement: HTMLDivElement;

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

  function handleMove(folder: string) {
    onmove(folder);
  }
</script>

<div
  bind:this={menuElement}
  class="context-menu"
  style="left: {adjustedPosition().x}px; top: {adjustedPosition().y}px;"
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => e.key === 'Escape' && onclose()}
  role="menu"
  tabindex="-1"
>
  <div
    class="menu-item"
    onmouseenter={() => showFolderSubmenu = true}
    onmouseleave={() => showFolderSubmenu = false}
    role="menuitem"
    tabindex="0"
  >
    <span>📁 Move to...</span>
    <span class="arrow">›</span>

    {#if showFolderSubmenu}
      <div class="submenu" role="menu">
        <button
          class="menu-item"
          onclick={() => handleMove('')}
          type="button"
          role="menuitem"
        >
          🏠 Root (No Folder)
        </button>
        {#each folders as folder (folder.path)}
          <button
            class="menu-item"
            onclick={() => handleMove(folder.path)}
            type="button"
            role="menuitem"
          >
            📁 {folder.name}
          </button>
        {/each}
        {#if folders.length === 0}
          <div class="menu-item disabled" role="menuitem">No folders available</div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="divider"></div>

  <button
    class="menu-item danger"
    onclick={ondelete}
    type="button"
    role="menuitem"
  >
    🗑️ Delete
  </button>
</div>

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
    justify-content: space-between;
    text-align: left;
    padding: 0.625rem 0.875rem;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #374151;
    transition: background-color 0.15s;
    position: relative;
  }

  .menu-item:hover:not(.disabled) {
    background: #f3f4f6;
  }

  .menu-item.danger:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  .menu-item.disabled {
    color: #9ca3af;
    cursor: default;
  }

  .arrow {
    color: #9ca3af;
    font-size: 1rem;
  }

  .divider {
    height: 1px;
    background: #e5e7eb;
    margin: 0.375rem 0;
  }

  .submenu {
    position: absolute;
    left: 100%;
    top: -0.375rem;
    margin-left: 0.25rem;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    padding: 0.375rem;
    min-width: 200px;
    max-height: 300px;
    overflow-y: auto;
  }

  .submenu::-webkit-scrollbar {
    width: 6px;
  }

  .submenu::-webkit-scrollbar-track {
    background: #f9fafb;
  }

  .submenu::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
</style>