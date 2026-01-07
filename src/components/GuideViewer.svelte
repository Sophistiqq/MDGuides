<script lang="ts">
  import { marked } from 'marked';
  import { deleteGuide, updateGuide, getVersionHistory, type Guide, type Version } from '../lib/opfs';
  import VersionHistory from './VersionHistory.svelte';

  type Props = {
    guide: Guide | null;
    onupdated?: () => void;
    ondeleted?: () => void;
  };

  let { guide, onupdated = () => {}, ondeleted = () => {} }: Props = $props();

  let isEditing = $state(false);
  let editContent = $state('');
  let isLoading = $state(false);
  let showVersions = $state(false);
  let versions = $state<Version[]>([]);

  // Reactive HTML rendering
  const htmlContent = $derived(
    guide && !isEditing ? marked.parse(guide.content) : ''
  );

  function startEdit() {
    if (!guide) return;
    editContent = guide.content;
    isEditing = true;
  }

  function cancelEdit() {
    isEditing = false;
    editContent = '';
  }

  async function saveEdit() {
    if (!guide || !editContent.trim()) return;

    isLoading = true;
    try {
      await updateGuide(guide.id, editContent.trim());
      isEditing = false;
      editContent = '';
      onupdated();
    } catch (error) {
      console.error('Failed to update guide:', error);
      alert('Failed to update guide. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  async function handleDelete() {
    if (!guide) return;

    const confirmed = confirm(`Are you sure you want to delete "${guide.title}"?`);
    if (!confirmed) return;

    isLoading = true;
    try {
      await deleteGuide(guide.id);
      ondeleted();
    } catch (error) {
      console.error('Failed to delete guide:', error);
      alert('Failed to delete guide. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  async function toggleVersionHistory() {
    if (!guide) return;

    if (!showVersions) {
      versions = await getVersionHistory(guide.id);
    }
    showVersions = !showVersions;
  }

  async function restoreVersion(version: Version) {
    if (!guide) return;

    const confirmed = confirm(`Restore this version from ${new Date(version.timestamp).toLocaleString()}?`);
    if (!confirmed) return;

    isLoading = true;
    try {
      await updateGuide(guide.id, version.content);
      showVersions = false;
      onupdated();
    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('Failed to restore version. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  function downloadGuide() {
    if (!guide) return;

    const blob = new Blob([guide.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${guide.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<main class="content">
  {#if guide}
    <div class="toolbar">
      <div class="toolbar-left">
        {#if !isEditing}
          <button class="btn btn-secondary" onclick={startEdit} disabled={isLoading}>
            ✏️ Edit
          </button>
          <button class="btn btn-secondary" onclick={toggleVersionHistory} disabled={isLoading}>
            📜 {showVersions ? 'Hide' : 'Show'} History
          </button>
          <button class="btn btn-secondary" onclick={downloadGuide} disabled={isLoading}>
            💾 Download
          </button>
        {/if}
      </div>
      <div class="toolbar-right">
        {#if isEditing}
          <button class="btn btn-primary" onclick={saveEdit} disabled={isLoading}>
            {isLoading ? 'Saving...' : '💾 Save'}
          </button>
          <button class="btn btn-secondary" onclick={cancelEdit} disabled={isLoading}>
            ❌ Cancel
          </button>
        {:else}
          <button class="btn btn-danger" onclick={handleDelete} disabled={isLoading}>
            🗑️ Delete
          </button>
        {/if}
      </div>
    </div>

    {#if showVersions && !isEditing}
      <VersionHistory {versions} onrestore={restoreVersion} />
    {/if}

    {#if isEditing}
      <div class="editor">
        <textarea
          class="edit-textarea"
          bind:value={editContent}
          disabled={isLoading}
          rows="20"
        ></textarea>
      </div>
    {:else}
      <article class="guide">
        {@html htmlContent}
      </article>
    {/if}
  {:else}
    <div class="empty-state">
      <p class="empty-text">Select a guide to view</p>
    </div>
  {/if}
</main>

<style>
  .content {
    flex: 1;
    overflow-y: auto;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
    gap: 1rem;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    gap: 0.5rem;
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
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #d1d5db;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #dc2626;
  }

  .editor {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .edit-textarea {
    width: 100%;
    height: 100%;
    min-height: 400px;
    padding: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.9375rem;
    font-family: 'Courier New', monospace;
    resize: vertical;
  }

  .edit-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .guide {
    flex: 1;
    max-width: 48rem;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    width: 100%;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
  }

  .empty-text {
    color: #6b7280;
    font-size: 1rem;
  }

  /* Markdown styling */
  .guide :global(h1) {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 1.5rem;
    color: #111827;
  }

  .guide :global(h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 2rem 0 1rem;
    color: #1f2937;
  }

  .guide :global(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
    color: #374151;
  }

  .guide :global(p) {
    margin: 0 0 1rem;
    line-height: 1.625;
    color: #374151;
  }

  .guide :global(ul),
  .guide :global(ol) {
    margin: 0 0 1rem;
    padding-left: 1.75rem;
  }

  .guide :global(li) {
    margin: 0.375rem 0;
    line-height: 1.625;
    color: #374151;
  }

  .guide :global(pre) {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
    overflow-x: auto;
    margin: 0 0 1rem;
  }

  .guide :global(code) {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: 'Courier New', monospace;
  }

  .guide :global(pre code) {
    background: none;
    padding: 0;
  }

  .guide :global(blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 0 0 1rem;
    color: #6b7280;
    font-style: italic;
  }

  .guide :global(a) {
    color: #3b82f6;
    text-decoration: underline;
  }

  .guide :global(a:hover) {
    color: #2563eb;
  }
</style>