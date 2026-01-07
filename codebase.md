# package.json

```json
{
  "name": "guide-ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^6.2.1",
    "@tsconfig/svelte": "^5.0.5",
    "@types/node": "^24.6.2",
    "@vite-pwa/assets-generator": "^1.0.2",
    "svelte": "^5.39.9",
    "svelte-check": "^4.3.2",
    "typescript": "~5.9.3",
    "vite": "^7.1.9",
    "vite-plugin-pwa": "^1.1.0",
    "workbox-window": "^7.4.0"
  },
  "resolutions": {
    "sharp": "^0.33.5",
    "sharp-ico": "^0.1.5"
  },
  "dependencies": {
    "@codemirror/commands": "^6.10.1",
    "@codemirror/lang-markdown": "^6.5.0",
    "@codemirror/language": "^6.12.1",
    "@codemirror/state": "^6.5.3",
    "@codemirror/theme-one-dark": "^6.1.3",
    "@codemirror/view": "^6.39.9",
    "codemirror": "^6.0.2",
    "marked": "^17.0.1"
  }
}

```

# src\app.css

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #1f2937;
  background: #ffffff;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
```

# src\App.svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Sidebar from './components/Sidebar.svelte';
  import AddGuide from './components/AddGuide.svelte';
  import GuideViewer from './components/GuideViewer.svelte';
  import TrashBin from './components/TrashBin.svelte';
  import { listGuides, type Guide } from './lib/opfs';

  let guides = $state<Guide[]>([]);
  let selectedGuideId = $state<string | null>(null);
  let showTrash = $state(false);

  // Reactive derived state
  const selectedGuide = $derived(
    guides.find(g => g.id === selectedGuideId) ?? null
  );

  onMount(loadGuides);

  async function loadGuides() {
    guides = await listGuides();
  }

  function handleSelectGuide(id: string) {
    selectedGuideId = id;
    showTrash = false;
  }

  function handleGuideAdded() {
    loadGuides();
  }

  async function handleGuideUpdated() {
    const currentId = selectedGuideId;
    await loadGuides();
    // Re-trigger selection to update the view
    if (currentId) {
      selectedGuideId = currentId;
    }
  }

  function handleGuideDeleted() {
    selectedGuideId = null;
    loadGuides();
  }

  function toggleTrash() {
    showTrash = !showTrash;
    if (showTrash) {
      selectedGuideId = null;
    }
  }

  function handleTrashChanged() {
    loadGuides();
  }
</script>

<div class="layout">
  <Sidebar
    {guides}
    selectedId={selectedGuideId}
    onselect={handleSelectGuide}
    onshowtrash={toggleTrash}
    {showTrash}
  />

  <div class="main">
    {#if showTrash}
      <TrashBin ontrashchanged={handleTrashChanged} />
    {:else}
      <AddGuide onguideadded={handleGuideAdded} />
      <GuideViewer 
        guide={selectedGuide}
        onupdated={handleGuideUpdated}
        ondeleted={handleGuideDeleted}
      />
    {/if}
  </div>
</div>

<style>
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
```


# src\components\AddGuide.svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { getGuidesDir } from '../lib/opfs';

  type Props = {
    onguideadded: () => void;
  };

  let { onguideadded }: Props = $props();

  let title = $state('');
  let showModal = $state(false);
  let isLoading = $state(false);
  let editorElement: HTMLElement;
  let editorView: EditorView | null = null;

  // Reactive validation
  const canSubmit = $derived(title.trim().length > 0 && !isLoading);

  onMount(() => {
    return () => {
      // Cleanup editor when component unmounts
      if (editorView) {
        editorView.destroy();
      }
    };
  });

  function openModal() {
    showModal = true;
    // Initialize editor after modal is shown
    setTimeout(() => {
      if (editorElement && !editorView) {
        editorView = new EditorView({
          state: EditorState.create({
            doc: '',
            extensions: [
              basicSetup,
              markdown(),
              oneDark,
              EditorView.lineWrapping,
            ]
          }),
          parent: editorElement
        });
      }
    }, 50);
  }

  function closeModal() {
    showModal = false;
    title = '';
    if (editorView) {
      editorView.destroy();
      editorView = null;
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !editorView) return;

    const content = editorView.state.doc.toString();
    
    if (!content.trim()) {
      alert('Please enter some content for the guide');
      return;
    }

    isLoading = true;

    try {
      const mdContent = `# ${title}\n\n${content.trim()}`;

      const dir = await getGuidesDir();
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      const fileHandle = await dir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(mdContent);
      await writable.close();

      onguideadded();
      closeModal();
    } catch (error) {
      console.error('Failed to add guide:', error);
      alert('Failed to add guide. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && showModal) {
      closeModal();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="add-guide-container">
  <button
    class="add-guide-btn"
    onclick={openModal}
    type="button"
  >
    ➕ New Guide
  </button>
</div>

{#if showModal}
  <div class="modal-overlay" onclick={closeModal}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Create New Guide</h2>
        <button class="close-btn" onclick={closeModal} type="button">✕</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="guide-title">Title</label>
          <input
            id="guide-title"
            class="input"
            placeholder="Enter guide title"
            bind:value={title}
            disabled={isLoading}
            required
          />
        </div>

        <div class="form-group">
          <label>Content (Markdown)</label>
          <div class="editor-container">
            <div bind:this={editorElement} class="editor"></div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn btn-secondary"
          onclick={closeModal}
          disabled={isLoading}
          type="button"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary"
          onclick={handleSubmit}
          disabled={!canSubmit}
          type="button"
        >
          {isLoading ? 'Creating...' : 'Create Guide'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .add-guide-container {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #ffffff;
  }

  .add-guide-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px dashed #d1d5db;
    background: #f9fafb;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #3b82f6;
    transition: all 0.15s;
  }

  .add-guide-btn:hover {
    background: #eff6ff;
    border-color: #3b82f6;
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
    padding: 1rem;
  }

  .modal {
    background: #ffffff;
    border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
  }

  .close-btn {
    width: 2rem;
    height: 2rem;
    border: none;
    background: #f3f4f6;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1.25rem;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
    font-size: 0.9375rem;
  }

  .input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }

  .editor-container {
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .editor {
    height: 400px;
    overflow: auto;
  }

  .editor :global(.cm-editor) {
    height: 100%;
  }

  .editor :global(.cm-scroller) {
    overflow: auto;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
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
</style>
```

# src\components\GuideViewer.svelte

```svelte
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
```

# src\components\Sidebar.svelte

```svelte
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
```

# src\components\TrashBin.svelte

```svelte
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
```

# src\components\VersionHistory.svelte

```svelte
<script lang="ts">
  import { marked } from 'marked';
  import type { Version } from '../lib/opfs';

  type Props = {
    versions: Version[];
    onrestore: (version: Version) => void;
  };

  let { versions, onrestore }: Props = $props();

  let selectedVersion = $state<Version | null>(null);

  const previewContent = $derived(
    selectedVersion ? marked.parse(selectedVersion.content) : ''
  );

  function selectVersion(version: Version) {
    selectedVersion = selectedVersion?.timestamp === version.timestamp ? null : version;
  }
</script>

<div class="version-history">
  <div class="versions-list">
    <h3 class="versions-title">Version History</h3>
    {#if versions.length === 0}
      <p class="empty">No version history available</p>
    {:else}
      <ul class="list">
        {#each versions as version (version.timestamp)}
          <li>
            <button
              class="version-btn"
              class:selected={selectedVersion?.timestamp === version.timestamp}
              onclick={() => selectVersion(version)}
            >
              <div class="version-date">
                {new Date(version.timestamp).toLocaleString()}
              </div>
              {#if version.author}
                <div class="version-author">by {version.author}</div>
              {/if}
            </button>
            {#if selectedVersion?.timestamp === version.timestamp}
              <button
                class="restore-btn"
                onclick={() => onrestore(version)}
              >
                ↺ Restore
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if selectedVersion}
    <div class="version-preview">
      <div class="preview-header">
        <h4>Preview</h4>
      </div>
      <div class="preview-content">
        {@html previewContent}
      </div>
    </div>
  {/if}
</div>

<style>
  .version-history {
    display: flex;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    max-height: 300px;
  }

  .versions-list {
    width: 300px;
    border-right: 1px solid #e5e7eb;
    overflow-y: auto;
  }

  .versions-title {
    font-size: 1rem;
    font-weight: 600;
    padding: 1rem;
    margin: 0;
    border-bottom: 1px solid #e5e7eb;
    background: #ffffff;
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

  .list li {
    margin-bottom: 0.25rem;
  }

  .version-btn {
    width: 100%;
    text-align: left;
    padding: 0.625rem 0.75rem;
    border: none;
    background: #ffffff;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: background-color 0.15s;
    border: 1px solid #e5e7eb;
  }

  .version-btn:hover {
    background: #f3f4f6;
  }

  .version-btn.selected {
    background: #e0e7ff;
    border-color: #6366f1;
  }

  .version-date {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
  }

  .version-author {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .restore-btn {
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.375rem 0.75rem;
    border: none;
    background: #3b82f6;
    color: white;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: background-color 0.15s;
  }

  .restore-btn:hover {
    background: #2563eb;
  }

  .version-preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .preview-header {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    background: #ffffff;
  }

  .preview-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background: #ffffff;
  }

  .preview-content :global(h1) {
    font-size: 1.5rem;
    margin: 0 0 1rem;
  }

  .preview-content :global(h2) {
    font-size: 1.25rem;
    margin: 1rem 0 0.5rem;
  }

  .preview-content :global(p) {
    margin: 0 0 0.75rem;
    line-height: 1.5;
  }

  .preview-content :global(ul) {
    margin: 0 0 0.75rem;
    padding-left: 1.5rem;
  }
</style>
```

# src\lib\opfs.ts

```ts
export type Guide = {
  id: string;
  title: string;
  content: string;
};

export type TrashedGuide = Guide & {
  deletedAt: number;
};

export type Version = {
  timestamp: number;
  content: string;
  author?: string;
};

export async function getGuidesDir() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle('guides', { create: true });
}

export async function getTrashDir() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle('trash', { create: true });
}

export async function getVersionsDir() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle('versions', { create: true });
}

export async function listGuides() {
  const dir = await getGuidesDir();
  const guides: Guide[] = [];

  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file' || !name.endsWith('.md')) continue;

    const file = await handle.getFile();
    const content = await file.text();

    guides.push({
      id: name.replace('.md', ''),
      title: extractTitle(content) ?? name.replace('.md', ''),
      content
    });
  }

  return guides;
}

export async function listTrashedGuides() {
  const dir = await getTrashDir();
  const guides: TrashedGuide[] = [];

  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file' || !name.endsWith('.md')) continue;

    const file = await handle.getFile();
    const content = await file.text();
    
    // Extract metadata from the first line if it exists
    const lines = content.split('\n');
    let deletedAt = file.lastModified; // fallback to file modification time
    let actualContent = content;
    
    if (lines[0].startsWith('<!-- DELETED_AT:')) {
      const match = lines[0].match(/<!-- DELETED_AT:(\d+) -->/);
      if (match) {
        deletedAt = parseInt(match[1]);
        actualContent = lines.slice(1).join('\n').trim();
      }
    }

    guides.push({
      id: name.replace('.md', ''),
      title: extractTitle(actualContent) ?? name.replace('.md', ''),
      content: actualContent,
      deletedAt
    });
  }

  // Sort by deletion date, newest first
  guides.sort((a, b) => b.deletedAt - a.deletedAt);

  return guides;
}

export async function updateGuide(id: string, content: string) {
  // Save current version to history before updating
  await saveVersion(id, content);

  const dir = await getGuidesDir();
  const filename = `${id}.md`;
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteGuide(id: string) {
  // Move to trash instead of deleting
  const guidesDir = await getGuidesDir();
  const trashDir = await getTrashDir();
  
  // Read the guide content
  const fileHandle = await guidesDir.getFileHandle(`${id}.md`);
  const file = await fileHandle.getFile();
  const content = await file.text();
  
  // Save to trash with deletion timestamp
  const deletedAt = Date.now();
  const trashContent = `<!-- DELETED_AT:${deletedAt} -->\n${content}`;
  const trashHandle = await trashDir.getFileHandle(`${id}.md`, { create: true });
  const writable = await trashHandle.createWritable();
  await writable.write(trashContent);
  await writable.close();
  
  // Remove from guides directory
  await guidesDir.removeEntry(`${id}.md`);
}

export async function restoreGuide(id: string) {
  const trashDir = await getTrashDir();
  const guidesDir = await getGuidesDir();
  
  // Read from trash
  const trashHandle = await trashDir.getFileHandle(`${id}.md`);
  const file = await trashHandle.getFile();
  let content = await file.text();
  
  // Remove metadata line if it exists
  const lines = content.split('\n');
  if (lines[0].startsWith('<!-- DELETED_AT:')) {
    content = lines.slice(1).join('\n').trim();
  }
  
  // Restore to guides
  const guideHandle = await guidesDir.getFileHandle(`${id}.md`, { create: true });
  const writable = await guideHandle.createWritable();
  await writable.write(content);
  await writable.close();
  
  // Remove from trash
  await trashDir.removeEntry(`${id}.md`);
}

export async function permanentlyDeleteGuide(id: string) {
  const trashDir = await getTrashDir();
  await trashDir.removeEntry(`${id}.md`);
  
  // Also delete version history
  try {
    const versionsDir = await getVersionsDir();
    const versionDirHandle = await versionsDir.getDirectoryHandle(id);
    
    // Delete all version files
    for await (const [name] of versionDirHandle.entries()) {
      await versionDirHandle.removeEntry(name);
    }
    
    // Delete the version directory
    await versionsDir.removeEntry(id);
  } catch (error) {
    // Version directory might not exist, that's okay
    console.log('No version history to delete');
  }
}

export async function saveVersion(guideId: string, content: string) {
  const versionsDir = await getVersionsDir();
  const guideVersionDir = await versionsDir.getDirectoryHandle(guideId, { create: true });
  
  const timestamp = Date.now();
  const filename = `${timestamp}.md`;
  
  const fileHandle = await guideVersionDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function getVersionHistory(guideId: string): Promise<Version[]> {
  const versions: Version[] = [];
  
  try {
    const versionsDir = await getVersionsDir();
    const guideVersionDir = await versionsDir.getDirectoryHandle(guideId);
    
    for await (const [name, handle] of guideVersionDir.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.md')) continue;
      
      const timestamp = parseInt(name.replace('.md', ''));
      const file = await handle.getFile();
      const content = await file.text();
      
      versions.push({
        timestamp,
        content
      });
    }
    
    // Sort by timestamp descending (newest first)
    versions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    // No version history exists yet
    console.log('No version history found');
  }
  
  return versions;
}

function extractTitle(md: string) {
  const match = md.match(/^#\s+(.+)$/m);
  return match?.[1];
}

export async function exportAllGuides() {
  const guides = await listGuides();
  
  if (guides.length === 0) {
    alert('No guides to export');
    return;
  }

  // Create a zip-like structure using JSZip alternative (simple approach)
  // Since we can't use external libraries, we'll download each file
  for (const guide of guides) {
    const blob = new Blob([guide.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${guide.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Small delay between downloads to prevent browser blocking
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export async function exportAllData() {
  const guides = await listGuides();
  const trashedGuides = await listTrashedGuides();
  
  // Create a complete backup as JSON
  const backup = {
    exportDate: new Date().toISOString(),
    guides: guides,
    trash: trashedGuides,
    versions: {} as Record<string, Version[]>
  };
  
  // Get version history for each guide
  for (const guide of guides) {
    const versions = await getVersionHistory(guide.id);
    if (versions.length > 0) {
      backup.versions[guide.id] = versions;
    }
  }
  
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guidy-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

