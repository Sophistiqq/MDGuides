<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import { listTrashedGuides, restoreGuide, permanentlyDeleteGuide, type TrashedGuide } from '../lib/opfs';

  type Props = {
    ontrashchanged?: () => void;
  };

  let { ontrashchanged = () => {} }: Props = $props();

  let trashedGuides = $state<TrashedGuide[]>([]);
  let selectedTrash = $state<TrashedGuide | null>(null);
  let isLoading = $state(false);

  const previewContent = $derived(
    selectedTrash ? marked.parse(selectedTrash.content) : ''
  );

  onMount(loadTrash);

  async function loadTrash() {
    trashedGuides = await listTrashedGuides();
  }

  function selectTrash(guide: TrashedGuide) {
    selectedTrash = selectedTrash?.id === guide.id ? null : guide;
  }

  async function handleRestore(guide: TrashedGuide) {
    const confirmed = confirm(`Restore "${guide.title}"?`);
    if (!confirmed) return;

    isLoading = true;
    try {
      await restoreGuide(guide.id);
      await loadTrash();
      selectedTrash = null;
      ontrashchanged();
    } catch (error) {
      console.error('Failed to restore guide:', error);
      alert('Failed to restore guide. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  async function handlePermanentDelete(guide: TrashedGuide) {
    const confirmed = confirm(`Permanently delete "${guide.title}"? This cannot be undone!`);
    if (!confirmed) return;

    isLoading = true;
    try {
      await permanentlyDeleteGuide(guide.id);
      await loadTrash();
      selectedTrash = null;
    } catch (error) {
      console.error('Failed to delete guide:', error);
      alert('Failed to delete guide. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  async function handleEmptyTrash() {
    const confirmed = confirm(`Permanently delete all ${trashedGuides.length} items in trash? This cannot be undone!`);
    if (!confirmed) return;

    isLoading = true;
    try {
      for (const guide of trashedGuides) {
        await permanentlyDeleteGuide(guide.id);
      }
      await loadTrash();
      selectedTrash = null;
    } catch (error) {
      console.error('Failed to empty trash:', error);
      alert('Failed to empty trash. Please try again.');
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="trash-container">
  <div class="trash-header">
    <h2>🗑️ Trash Bin</h2>
    {#if trashedGuides.length > 0}
      <button
        class="btn btn-danger-outline"
        onclick={handleEmptyTrash}
        disabled={isLoading}
      >
        Empty Trash
      </button>
    {/if}
  </div>

  <div class="trash-content">
    <div class="trash-list">
      {#if trashedGuides.length === 0}
        <p class="empty">Trash is empty</p>
      {:else}
        <ul class="list">
          {#each trashedGuides as guide (guide.id)}
            <li>
              <button
                class="trash-item"
                class:selected={selectedTrash?.id === guide.id}
                onclick={() => selectTrash(guide)}
                disabled={isLoading}
              >
                <div class="trash-item-title">{guide.title}</div>
                <div class="trash-item-date">
                  Deleted: {new Date(guide.deletedAt).toLocaleString()}
                </div>
              </button>
              
              {#if selectedTrash?.id === guide.id}
                <div class="trash-actions">
                  <button
                    class="btn btn-primary"
                    onclick={() => handleRestore(guide)}
                    disabled={isLoading}
                  >
                    ↺ Restore
                  </button>
                  <button
                    class="btn btn-danger"
                    onclick={() => handlePermanentDelete(guide)}
                    disabled={isLoading}
                  >
                    🗑️ Delete Forever
                  </button>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    {#if selectedTrash}
      <div class="trash-preview">
        <div class="preview-header">
          <h3>Preview</h3>
        </div>
        <div class="preview-content">
          {@html previewContent}
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  .trash-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #ffffff;
  }

  .trash-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #fef2f2;
  }

  .trash-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #991b1b;
  }

  .trash-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .trash-list {
    width: 350px;
    border-right: 1px solid #e5e7eb;
    background: #f9fafb;
    overflow-y: auto;
  }

  .empty {
    padding: 2rem 1rem;
    text-align: center;
    color: #6b7280;
  }

  .list {
    list-style: none;
    padding: 0.5rem;
    margin: 0;
  }

  .list li {
    margin-bottom: 0.5rem;
  }

  .trash-item {
    width: 100%;
    text-align: left;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.15s;
  }

  .trash-item:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  .trash-item.selected {
    background: #fef2f2;
    border-color: #fca5a5;
  }

  .trash-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .trash-item-title {
    font-weight: 500;
    color: #111827;
    margin-bottom: 0.25rem;
  }

  .trash-item-date {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .trash-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .trash-preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .preview-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .preview-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem 1.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
    flex: 1;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
    flex: 1;
  }

  .btn-danger:hover:not(:disabled) {
    background: #dc2626;
  }

  .btn-danger-outline {
    background: transparent;
    color: #ef4444;
    border: 1px solid #ef4444;
  }

  .btn-danger-outline:hover:not(:disabled) {
    background: #ef4444;
    color: white;
  }

  /* Markdown styling */
  .preview-content :global(h1) {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 1.5rem;
    color: #111827;
  }

  .preview-content :global(h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 2rem 0 1rem;
    color: #1f2937;
  }

  .preview-content :global(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
    color: #374151;
  }

  .preview-content :global(p) {
    margin: 0 0 1rem;
    line-height: 1.625;
    color: #374151;
  }

  .preview-content :global(ul),
  .preview-content :global(ol) {
    margin: 0 0 1rem;
    padding-left: 1.75rem;
  }

  .preview-content :global(li) {
    margin: 0.375rem 0;
    line-height: 1.625;
    color: #374151;
  }

  .preview-content :global(pre) {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
    overflow-x: auto;
    margin: 0 0 1rem;
  }

  .preview-content :global(code) {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: 'Courier New', monospace;
  }

  .preview-content :global(pre code) {
    background: none;
    padding: 0;
  }
</style>