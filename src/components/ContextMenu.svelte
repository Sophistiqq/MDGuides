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

  let menuElement = $state<HTMLElement>();

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
  class="fixed z-[2000] min-w-[180px]"
  style="left: {adjustedPosition().x}px; top: {adjustedPosition().y}px;"
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => e.key === 'Escape' && onclose()}
  role="menu"
  tabindex="-1"
>
  <ul class="menu bg-base-100 rounded-box shadow-2xl border border-base-300 p-1 w-full">
    <li>
      <details>
        <summary class="flex justify-between items-center py-2 px-3">
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            Move to...
          </span>
        </summary>
        <ul class="bg-base-100 border border-base-200 shadow-lg rounded-box z-[2001]">
          <li>
            <button onclick={() => handleMove('')} class="py-2 px-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001-1m-6 0h6" /></svg>
              Root (No Folder)
            </button>
          </li>
          {#each folders as folder (folder.path)}
            <li>
              <button onclick={() => handleMove(folder.path)} class="py-2 px-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-warning" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                {folder.name}
              </button>
            </li>
          {/each}
          {#if folders.length === 0}
            <li class="disabled"><span class="italic text-xs py-2 px-3">No folders</span></li>
          {/if}
        </ul>
      </details>
    </li>
    
    <div class="divider my-1"></div>
    
    <li>
      <button onclick={ondelete} class="text-error hover:bg-error/10 py-2 px-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        Delete
      </button>
    </li>
  </ul>
</div>
