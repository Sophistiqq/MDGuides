<script lang="ts">
  import type { Guide, Folder } from '../lib/opfs';
  import { exportAllGuides, exportAllData, importAllData, listFolders, createFolder, deleteFolder, renameFolder, moveGuideToFolder, deleteGuide } from '../lib/opfs';
  import ContextMenu from './ContextMenu.svelte';
  import FolderContextMenu from './FolderContextMenu.svelte';
  import Dialog from './Dialog.svelte';
  import { notifications } from '../lib/notifications';

  type Props = {
    guides: Guide[];
    selectedId: string | null;
    onselect: (id: string) => void;
    onshowtrash: () => void;
    onguideaction: () => void;
    onnewguide: () => void;
    showTrash: boolean;
    showNewGuide: boolean;
  };

  let { guides, selectedId, onselect, onshowtrash, onguideaction, onnewguide, showTrash, showNewGuide }: Props = $props();

  let isExporting = $state(false);
  let showNewFolderModal = $state(false);
  let newFolderName = $state('');
  let folders = $state<Folder[]>([]);
  let expandedFolders = $state<Set<string>>(new Set());
  let contextMenu = $state<{ x: number; y: number; guideId: string } | null>(null);
  let folderContextMenu = $state<{ x: number; y: number; folderName: string } | null>(null);
  let showDeleteGuideConfirm = $state(false);
  let guideToDelete = $state<Guide | null>(null);
  let fileInput = $state<HTMLInputElement>();

  // Group guides by folder
  const groupedGuides = $derived(() => {
    const uncategorized: Guide[] = [];
    const byFolder: Record<string, Guide[]> = {};

    guides.forEach(guide => {
      if (!guide.folder) {
        uncategorized.push(guide);
      } else {
        if (!byFolder[guide.folder]) {
          byFolder[guide.folder] = [];
        }
        byFolder[guide.folder].push(guide);
      }
    });

    return { uncategorized, byFolder };
  });

  async function loadFolders() {
    folders = await listFolders();
  }

  async function handleExportAll() {
    isExporting = true;
    try {
      await exportAllGuides();
      notifications.success('All guides exported successfully');
    } catch (error) {
      console.error('Failed to export guides:', error);
      notifications.error('Failed to export guides');
    } finally {
      isExporting = false;
    }
  }

  async function handleExportComplete() {
    isExporting = true;
    try {
      await exportAllData();
      notifications.success('Full backup created successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      notifications.error('Failed to export data');
    } finally {
      isExporting = false;
    }
  }

  async function handleImportData(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    isExporting = true;
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await importAllData(content);
        await loadFolders();
        onguideaction();
        notifications.success('Data imported successfully');
      } catch (error) {
        console.error('Failed to import data:', error);
        notifications.error('Failed to import data. Ensure valid JSON backup.');
      } finally {
        isExporting = false;
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;

    try {
      await createFolder(newFolderName);
      newFolderName = '';
      showNewFolderModal = false;
      await loadFolders();
      onguideaction();
      notifications.success('Folder created');
    } catch (error) {
      console.error('Failed to create folder:', error);
      notifications.error('Failed to create folder');
    }
  }

  function toggleFolder(folderName: string) {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    expandedFolders = newExpanded;
  }

  function handleContextMenu(e: MouseEvent, guideId: string) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      guideId
    };
  }

  function closeContextMenu() {
    contextMenu = null;
    folderContextMenu = null;
  }

  function handleFolderContextMenu(e: MouseEvent, folderName: string) {
    e.preventDefault();
    e.stopPropagation();
    folderContextMenu = {
      x: e.clientX,
      y: e.clientY,
      folderName
    };
  }

  async function handleRenameFolder(oldName: string, newName: string) {
    try {
      await renameFolder(oldName, newName);
      await loadFolders();
      closeContextMenu();
      onguideaction();
      notifications.success('Folder renamed');
    } catch (error) {
      console.error('Failed to rename folder:', error);
      notifications.error('Failed to rename folder');
    }
  }

  async function handleDeleteFolder(folderName: string) {
    const guidesInFolder = groupedGuides().byFolder[folderName] || [];
    
    if (guidesInFolder.length > 0) {
      notifications.warning(`Cannot delete folder "${folderName}". It contains ${guidesInFolder.length} guide(s).`);
      return;
    }

    try {
      await deleteFolder(folderName);
      await loadFolders();
      closeContextMenu();
      onguideaction();
      notifications.success('Folder deleted');
    } catch (error) {
      console.error('Failed to delete folder:', error);
      notifications.error('Failed to delete folder');
    }
  }

  async function handleMoveGuide(targetFolder: string) {
    if (!contextMenu) return;

    try {
      await moveGuideToFolder(contextMenu.guideId, targetFolder);
      closeContextMenu();
      onguideaction();
      notifications.success('Guide moved');
    } catch (error) {
      console.error('Failed to move guide:', error);
      notifications.error('Failed to move guide');
    }
  }

  function confirmDeleteGuide() {
    if (!contextMenu) return;
    const guide = guides.find(g => g.id === contextMenu?.guideId);
    if (!guide) return;
    
    guideToDelete = guide;
    showDeleteGuideConfirm = true;
    // Don't close context menu yet so we can still use its state
  }

  async function handleDeleteGuide() {
    if (!guideToDelete) return;

    try {
      await deleteGuide(guideToDelete.id);
      closeContextMenu();
      showDeleteGuideConfirm = false;
      guideToDelete = null;
      onguideaction();
      notifications.success(`Moved guide to trash`);
    } catch (error) {
      console.error('Failed to delete guide:', error);
      notifications.error('Failed to delete guide');
    }
  }

  $effect(() => {
    loadFolders();
  });

  $effect(() => {
    guides;
    loadFolders();
  });
</script>

<svelte:window onclick={closeContextMenu} />

<aside class="w-72 flex flex-col h-full bg-base-200 border-r border-base-300 shadow-sm z-10">
  <div class="p-4 flex items-center justify-between border-b border-base-300 bg-base-100">
    <h1 class="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
      <img src="/icon.svg" alt="Guidy Logo" class="h-8 w-8" />
      Guidy
    </h1>
    <button class="btn btn-ghost btn-circle btn-sm" onclick={onnewguide} title="New Guide">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>

  <div class="flex-1 overflow-y-auto overflow-x-hidden p-2">
    {#if guides.length === 0 && folders.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-base-content/40 text-center px-4">
        <p class="text-sm">No guides or folders yet. Create one to get started!</p>
      </div>
    {:else}
      <ul class="menu menu-sm w-full p-0">
        <!-- Uncategorized guides -->
        {#each groupedGuides().uncategorized as guide (guide.id)}
          <li class="group">
            <div
              class="flex justify-between items-center pr-1 {guide.id === selectedId && !showTrash && !showNewGuide ? 'active' : ''}"
              onclick={() => onselect(guide.id)}
              oncontextmenu={(e) => handleContextMenu(e, guide.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && onselect(guide.id)}
            >
              <span class="truncate flex-1 py-1">{guide.title}</span>
              <button
                class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Options"
                onclick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, guide.id);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
            </div>
          </li>
        {/each}

        <!-- Folders -->
        {#each folders as folder (folder.path)}
          <li>
            <details open={expandedFolders.has(folder.name)}>
              <summary
                class="group flex justify-between pr-1"
                onclick={() => toggleFolder(folder.name)}
                oncontextmenu={(e) => handleFolderContextMenu(e, folder.name)}
              >
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span class="font-medium">{folder.name}</span>
                </div>
              </summary>
              <ul>
                {#if groupedGuides().byFolder[folder.name]?.length > 0}
                  {#each groupedGuides().byFolder[folder.name] as guide (guide.id)}
                    <li class="group">
                      <div
                        class="flex justify-between items-center pr-1 {guide.id === selectedId && !showTrash && !showNewGuide ? 'active' : ''}"
                        onclick={() => onselect(guide.id)}
                        oncontextmenu={(e) => handleContextMenu(e, guide.id)}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) => e.key === 'Enter' && onselect(guide.id)}
                      >
                        <span class="truncate flex-1 py-1">{guide.title}</span>
                        <button
                          class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Options"
                          onclick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, guide.id);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                        </button>
                      </div>
                    </li>
                  {/each}
                {:else}
                  <li class="disabled"><span class="italic text-xs opacity-50">Empty folder</span></li>
                {/if}
              </ul>
            </details>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="p-4 border-top border-base-300 bg-base-100 flex flex-col gap-2 shadow-inner">
    <div class="grid grid-cols-2 gap-2">
      <button class="btn btn-outline btn-sm" onclick={() => showNewFolderModal = true}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        Folder
      </button>
      <button class="btn btn-sm {showTrash ? 'btn-error' : 'btn-outline'}" onclick={onshowtrash}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Trash
      </button>
    </div>

    <div class="dropdown dropdown-top w-full">
      <button tabindex="0" class="btn btn-ghost btn-block btn-sm justify-between">
        More Actions
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
      </button>
      <ul class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full mb-2 border border-base-300">
        <li><button onclick={handleExportAll} disabled={guides.length === 0}>Export All MD</button></li>
        <li><button onclick={handleExportComplete}>Full Backup (JSON)</button></li>
        <li>
          <button onclick={() => fileInput?.click()}>
            Import Backup
          </button>
          <input 
            type="file" 
            accept=".json" 
            onchange={handleImportData} 
            class="hidden" 
            bind:this={fileInput} 
          />
        </li>
        <div class="divider my-1"></div>
        <li><a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noreferrer">Markdown Syntax Guide</a></li>
      </ul>
    </div>
  </div>
</aside>

<Dialog 
  bind:open={showNewFolderModal} 
  title="Create New Folder"
  confirmText="Create"
  onConfirm={handleCreateFolder}
>
  <div class="form-control w-full">
    <label class="label" for="folder-name">
      <span class="label-text">Folder Name</span>
    </label>
    <input
      id="folder-name"
      type="text"
      placeholder="e.g. Work, Personal, Tutorials"
      class="input input-bordered w-full"
      bind:value={newFolderName}
      onkeydown={(e) => e.key === 'Enter' && handleCreateFolder()}
    />
  </div>
</Dialog>

<Dialog 
  bind:open={showDeleteGuideConfirm} 
  title="Move to Trash"
  confirmText="Move to Trash"
  onConfirm={handleDeleteGuide}
>
  <p>Are you sure you want to move <strong>{guideToDelete?.title}</strong> to the trash?</p>
</Dialog>

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    {folders}
    onmove={handleMoveGuide}
    ondelete={confirmDeleteGuide}
    onclose={closeContextMenu}
  />
{/if}

{#if folderContextMenu}
  <FolderContextMenu
    x={folderContextMenu.x}
    y={folderContextMenu.y}
    folderName={folderContextMenu.folderName}
    onrename={handleRenameFolder}
    ondelete={handleDeleteFolder}
    onclose={closeContextMenu}
  />
{/if}
