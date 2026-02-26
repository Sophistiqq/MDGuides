<script lang="ts">
  import type { Guide, Folder } from '../lib/opfs';
  import { exportAllGuides, exportAllData, importAllData, listFolders, createFolder, deleteFolder, renameFolder, moveGuideToFolder } from '../lib/opfs';
  import ContextMenu from './ContextMenu.svelte';
  import FolderContextMenu from './FolderContextMenu.svelte';

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
  let showMoveMenu = $state(false);

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
    } catch (error) {
      console.error('Failed to export guides:', error);
      alert('Failed to export guides. Please try again.');
    } finally {
      isExporting = false;
    }
  }

  async function handleExportComplete() {
    isExporting = true;
    try {
      await exportAllData();
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
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
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Failed to import data:', error);
        alert('Failed to import data. Please ensure the file is a valid Guidy backup.');
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
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder. Please try again.');
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
    showMoveMenu = false;
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
    } catch (error) {
      console.error('Failed to rename folder:', error);
      alert('Failed to rename folder. Please try again.');
    }
  }

  async function handleDeleteFolder(folderName: string) {
    const guidesInFolder = groupedGuides().byFolder[folderName] || [];
    
    if (guidesInFolder.length > 0) {
      alert(`Cannot delete folder "${folderName}". It contains ${guidesInFolder.length} guide(s). Please move or delete the guides first.`);
      return;
    }

    const confirmed = confirm(`Delete folder "${folderName}"?`);
    if (!confirmed) return;

    try {
      await deleteFolder(folderName);
      await loadFolders();
      closeContextMenu();
      onguideaction();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      alert('Failed to delete folder. Please try again.');
    }
  }

  async function handleMoveGuide(targetFolder: string) {
    if (!contextMenu) return;

    try {
      await moveGuideToFolder(contextMenu.guideId, targetFolder);
      closeContextMenu();
      onguideaction();
    } catch (error) {
      console.error('Failed to move guide:', error);
      alert('Failed to move guide. Please try again.');
    }
  }

  async function handleDeleteGuide() {
    if (!contextMenu) return;

    const guide = guides.find(g => g.id === contextMenu?.guideId);
    if (!guide) return;

    const confirmed = confirm(`Move "${guide.title}" to trash?`);
    if (!confirmed) return;

    try {
      const { deleteGuide } = await import('../lib/opfs');
      await deleteGuide(contextMenu.guideId);
      closeContextMenu();
      onguideaction();
    } catch (error) {
      console.error('Failed to delete guide:', error);
      alert('Failed to delete guide. Please try again.');
    }
  }

  $effect(() => {
    loadFolders();
  });

  // Load folders on mount and whenever guides change
  $effect(() => {
    // This will reactively update when guides change
    guides;
    loadFolders();
  });
</script>

<svelte:window onclick={closeContextMenu} />

<aside class="sidebar">
  <h2 class="title">Guides</h2>

  <div class="list-container">
    {#if guides.length === 0}
      <p class="empty">No guides yet</p>
    {:else}
      <ul class="list">
        <!-- Uncategorized guides -->
        {#each groupedGuides().uncategorized as guide (guide.id)}
          <li>
            <div class="guide-item">
              <div
                class="guide-btn"
                class:selected={guide.id === selectedId && !showTrash && !showNewGuide}
                onclick={() => onselect(guide.id)}
                oncontextmenu={(e) => handleContextMenu(e, guide.id)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && onselect(guide.id)}
              >
                <span class="guide-title">{guide.title}</span>
              </div>
              <button
                class="options-btn"
                onclick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, guide.id);
                }}
                type="button"
                aria-label="Options"
              >
                ⋮
              </button>
            </div>
          </li>
        {/each}

        <!-- Folders -->
        {#each folders as folder (folder.path)}
          <li class="folder-item">
            <div class="folder-header">
              <button
                class="folder-btn"
                onclick={() => toggleFolder(folder.name)}
                type="button"
              >
                <span class="folder-icon">{expandedFolders.has(folder.name) ? '📂' : '📁'}</span>
                <span class="folder-name">{folder.name}</span>
              </button>
              <button
                class="options-btn"
                onclick={(e) => {
                  e.stopPropagation();
                  handleFolderContextMenu(e, folder.name);
                }}
                type="button"
                aria-label="Folder options"
              >
                ⋮
              </button>
            </div>

            {#if expandedFolders.has(folder.name)}
              <ul class="folder-guides">
                {#if groupedGuides().byFolder[folder.name]?.length > 0}
                  {#each groupedGuides().byFolder[folder.name] as guide (guide.id)}
                    <li>
                      <div class="guide-item nested">
                        <div
                          class="guide-btn"
                          class:selected={guide.id === selectedId && !showTrash && !showNewGuide}
                          onclick={() => onselect(guide.id)}
                          oncontextmenu={(e) => handleContextMenu(e, guide.id)}
                          role="button"
                          tabindex="0"
                          onkeydown={(e) => e.key === 'Enter' && onselect(guide.id)}
                        >
                          <span class="guide-title">{guide.title}</span>
                        </div>
                        <button
                          class="options-btn"
                          onclick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, guide.id);
                          }}
                          type="button"
                          aria-label="Options"
                        >
                          ⋮
                        </button>
                      </div>
                    </li>
                  {/each}
                {:else}
                  <li class="empty-folder">Empty folder</li>
                {/if}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="actions">
    <button 
      class="action-btn new-guide-btn"
      onclick={onnewguide}
      type="button"
      disabled={isExporting}
    >
      ➕ New Guide
    </button>

    <button 
      class="action-btn"
      onclick={() => showNewFolderModal = true}
      type="button"
      disabled={isExporting}
    >
      📁 New Folder
    </button>

    <button 
      class="action-btn trash-btn"
      class:active={showTrash}
      onclick={onshowtrash}
      type="button"
      disabled={isExporting}
    >
      🗑️ {showTrash ? 'Hide Trash' : 'Trash'}
    </button>

    <button 
      class="action-btn export-btn"
      onclick={handleExportAll}
      type="button"
      disabled={isExporting || guides.length === 0}
      title="Export all guides as individual .md files"
    >
      📦 Export All
    </button>

    <button 
      class="action-btn export-btn"
      onclick={handleExportComplete}
      type="button"
      disabled={isExporting}
      title="Export complete backup (guides + versions + trash)"
    >
      💾 Full Backup
    </button>

    <label class="action-btn export-btn" title="Import data from a Guidy JSON backup">
      📥 Import Backup
      <input
        type="file"
        accept=".json"
        onchange={handleImportData}
        style="display: none;"
        disabled={isExporting}
      />
    </label>

    <button 
      class="action-btn export-btn"
      onclick={ () => {
        window.open('https://www.markdownguide.org/basic-syntax/', '_blank')
        }
      }
      type="button"
      disabled={isExporting}
      title="Export complete backup (guides + versions + trash)"
    >
      📖 Guide for writing
    </button>
  </div>
</aside>

{#if showNewFolderModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={() => showNewFolderModal = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h3>Create New Folder</h3>
      <input
        class="folder-input"
        placeholder="Folder name"
        bind:value={newFolderName}
        onkeydown={(e) => e.key === 'Enter' && handleCreateFolder()}
      />
      <div class="modal-actions">
        <button class="btn-secondary" onclick={() => showNewFolderModal = false}>Cancel</button>
        <button class="btn-primary" onclick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</button>
      </div>
    </div>
  </div>
{/if}

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    {folders}
    onmove={handleMoveGuide}
    ondelete={handleDeleteGuide}
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

<style>
  .sidebar {
    width: 260px;
    min-width: 260px;
    border-right: 1px solid #e5e7eb;
    background: #f9fafb;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    padding: 1.25rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  .list-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }

  .empty {
    padding: 1rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .list {
    list-style: none;
    padding: 0.5rem;
    margin: 0;
  }

  .guide-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    position: relative;
  }

  .guide-item.nested {
    padding-left: 1.5rem;
  }

  .guide-btn {
    flex: 1;
    display: flex;
    align-items: center;
    text-align: left;
    padding: 0.625rem 0.75rem;
    background: none;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: background-color 0.15s;
    font-size: 0.9375rem;
    color: #374151;
  }

  .guide-title {
    flex: 1;
    word-wrap: break-word;
    white-space: normal;
    overflow: hidden;
  }

  .options-btn {
    padding: 0.375rem 0.5rem;
    border: none;
    background: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 1.125rem;
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }

  .guide-item:hover .options-btn,
  .folder-header:hover .options-btn,
  .options-btn:focus {
    opacity: 1;
  }

  .options-btn:hover {
    color: #374151;
  }

  .guide-btn:hover {
    background: #f3f4f6;
  }

  .guide-btn.selected {
    background: #e5e7eb;
    font-weight: 500;
    color: #111827;
  }

  .guide-btn:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  .folder-item {
    margin-bottom: 0.25rem;
  }

  .folder-header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .folder-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: background-color 0.15s;
    font-size: 0.9375rem;
    color: #374151;
    font-weight: 500;
  }

  .folder-btn:hover {
    background: #f3f4f6;
  }

  .folder-icon {
    font-size: 1rem;
  }

  .folder-name {
    flex: 1;
  }

  .folder-guides {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .empty-folder {
    padding: 0.75rem 2rem;
    color: #9ca3af;
    font-size: 0.8125rem;
    font-style: italic;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
    background: #ffffff;
    flex-shrink: 0;
  }

  .action-btn {
    padding: 0.625rem 0.75rem;
    border: 1px solid #d1d5db;
    background: #ffffff;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    transition: all 0.15s;
    text-align: left;
  }

  .action-btn:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .trash-btn.active {
    background: #fee2e2;
    border-color: #ef4444;
    color: #dc2626;
  }

  .export-btn:hover:not(:disabled) {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #1e40af;
  }

  .new-guide-btn {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .new-guide-btn:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
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
    z-index: 1000;
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

  .list-container::-webkit-scrollbar {
    width: 8px;
  }

  .list-container::-webkit-scrollbar-track {
    background: #f9fafb;
  }

  .list-container::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  .list-container::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
</style>