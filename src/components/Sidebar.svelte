<script lang="ts">
  import type { Guide } from '../lib/opfs';
  import { exportAllGuides, exportAllData } from '../lib/opfs';

  type Props = {
    guides: Guide[];
    selectedId: string | null;
    onselect: (id: string) => void;
    onshowtrash: () => void;
    showTrash: boolean;
  };

  let { guides, selectedId, onselect, onshowtrash, showTrash }: Props = $props();

  let isExporting = $state(false);

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
</script>

<aside class="sidebar">
  <h2 class="title">Guides</h2>

  <div class="list-container">
    {#if guides.length === 0}
      <p class="empty">No guides yet</p>
    {:else}
      <ul class="list">
        {#each guides as guide (guide.id)}
          <li>
            <button
              class="guide-btn"
              class:selected={guide.id === selectedId && !showTrash}
              onclick={() => onselect(guide.id)}
              type="button"
            >
              {guide.title}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="actions">
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
  </div>
</aside>

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

  .guide-btn {
    width: 100%;
    text-align: left;
    padding: 0.625rem 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: background-color 0.15s;
    font-size: 0.9375rem;
    color: #374151;
    word-wrap: break-word;
    white-space: normal;
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

  /* Custom scrollbar styling */
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