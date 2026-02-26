<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { markdown } from '@codemirror/lang-markdown';
  import { renderMarkdown, setupMarkdownListeners } from '../lib/markdown';
  import { deleteGuide, updateGuide, getVersionHistory, type Guide, type Version } from '../lib/opfs';
  import VersionHistory from './VersionHistory.svelte';
  import { notifications } from '../lib/notifications';
  import Dialog from './Dialog.svelte';

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
  let showDeleteConfirm = $state(false);
  let versions = $state<Version[]>([]);
  let editorElement = $state<HTMLElement>();
  let editorView = $state<EditorView | null>(null);

  onMount(() => {
    return setupMarkdownListeners();
  });

  // Reactive HTML rendering for view mode
  const viewHtmlContent = $derived(
    guide && !isEditing ? renderMarkdown(guide.content) : ''
  );

  // Reactive HTML rendering for edit preview
  const editPreviewHtml = $derived(
    isEditing && editContent ? renderMarkdown(editContent) : '<p class="text-base-content/40 italic">Start editing to see preview...</p>'
  );

  function startEdit() {
    if (!guide) return;
    editContent = guide.content;
    isEditing = true;
    
    // Initialize CodeMirror after DOM update
    setTimeout(() => {
      if (editorElement && !editorView) {
        editorView = new EditorView({
          state: EditorState.create({
            doc: editContent,
            extensions: [
              basicSetup,
              markdown(),
              EditorView.lineWrapping,
              EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                  editContent = update.state.doc.toString();
                }
              })
            ]
          }),
          parent: editorElement
        });
      }
    }, 50);
  }

  function cancelEdit() {
    isEditing = false;
    editContent = '';
    if (editorView) {
      editorView.destroy();
      editorView = null;
    }
  }

  async function saveEdit() {
    if (!guide || !editContent.trim()) return;

    isLoading = true;
    try {
      await updateGuide(guide.id, editContent.trim());
      if (editorView) {
        editorView.destroy();
        editorView = null;
      }
      isEditing = false;
      editContent = '';
      onupdated();
      notifications.success('Guide saved');
    } catch (error) {
      console.error('Failed to update guide:', error);
      notifications.error('Failed to update guide');
    } finally {
      isLoading = false;
    }
  }

  async function handleDelete() {
    if (!guide) return;

    isLoading = true;
    try {
      await deleteGuide(guide.id);
      ondeleted();
      notifications.success('Guide moved to trash');
    } catch (error) {
      console.error('Failed to delete guide:', error);
      notifications.error('Failed to delete guide');
    } finally {
      isLoading = false;
      showDeleteConfirm = false;
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

    isLoading = true;
    try {
      await updateGuide(guide.id, version.content);
      showVersions = false;
      onupdated();
      notifications.success('Version restored');
    } catch (error) {
      console.error('Failed to restore version:', error);
      notifications.error('Failed to restore version');
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
    notifications.info('Download started');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isEditing && e.key === 'Escape') {
      cancelEdit();
    } else if (isEditing && (e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveEdit();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex-1 flex flex-col min-w-0 bg-base-100 relative">
  {#if guide}
    <header class="navbar bg-base-100 border-b border-base-300 px-4 min-h-[4rem]">
      <div class="flex-1">
        <h2 class="text-lg font-bold truncate pr-4">{guide.title}</h2>
      </div>
      <div class="flex-none gap-2">
        {#if !isEditing}
          <div class="hidden sm:flex gap-2">
            <button class="btn btn-ghost btn-sm" onclick={toggleVersionHistory} disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              History
            </button>
            <button class="btn btn-ghost btn-sm" onclick={downloadGuide} disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download
            </button>
            <button class="btn btn-primary btn-sm" onclick={startEdit} disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button class="btn btn-ghost btn-sm text-error" onclick={() => showDeleteConfirm = true} disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
          <!-- Mobile menu -->
          <div class="dropdown dropdown-end sm:hidden">
            <button tabindex="0" class="btn btn-ghost btn-sm" aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>
            <ul class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-300">
              <li><button onclick={startEdit}>Edit</button></li>
              <li><button onclick={toggleVersionHistory}>History</button></li>
              <li><button onclick={downloadGuide}>Download</button></li>
              <li><button onclick={() => showDeleteConfirm = true} class="text-error">Delete</button></li>
            </ul>
          </div>
        {:else}
          <button class="btn btn-ghost btn-sm" onclick={cancelEdit} disabled={isLoading}>Cancel</button>
          <button class="btn btn-primary btn-sm" onclick={saveEdit} disabled={isLoading}>
            {#if isLoading}<span class="loading loading-spinner loading-xs"></span>{/if}
            Save
          </button>
        {/if}
      </div>
    </header>

    <div class="flex-1 overflow-hidden flex flex-col">
      {#if showVersions && !isEditing}
        <div class="bg-base-200 border-b border-base-300">
          <VersionHistory {versions} onrestore={restoreVersion} />
        </div>
      {/if}

      {#if isEditing}
        <div class="flex-1 flex overflow-hidden">
          <div class="flex-1 flex flex-col border-r border-base-300 overflow-hidden">
            <div class="bg-base-200 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-base-content/50 border-b border-base-300">Editor</div>
            <div class="flex-1 overflow-auto bg-base-100" bind:this={editorElement}></div>
          </div>
          <div class="flex-1 hidden md:flex flex-col overflow-hidden bg-base-200">
            <div class="bg-base-200 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-base-content/50 border-b border-base-300">Preview</div>
            <div class="flex-1 overflow-auto p-8 prose-container">
              <article class="markdown-body">
                {@html editPreviewHtml}
              </article>
            </div>
          </div>
        </div>
      {:else}
        <div class="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 bg-base-100 prose-container">
          <article class="markdown-body max-w-4xl mx-auto">
            {@html viewHtmlContent}
          </article>
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-base-content/30 italic">Select a guide to view</p>
    </div>
  {/if}
</div>

<Dialog
  bind:open={showDeleteConfirm}
  title="Delete Guide"
  confirmText="Delete"
  onConfirm={handleDelete}
>
  <p>Are you sure you want to move <strong>{guide?.title}</strong> to the trash?</p>
</Dialog>

<style>
  @reference "../app.css";

  :global(.cm-editor) {
    height: 100%;
    outline: none !important;
  }
  
  :global(.cm-scroller) {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 14px;
    line-height: 1.6;
  }

  .markdown-body {
    line-height: 1.6;
    color: var(--color-base-content);
  }

  .markdown-body :global(h1) {
    @apply text-4xl font-extrabold mb-6 pb-2 border-b border-base-300 mt-8 first:mt-0;
  }

  .markdown-body :global(h2) {
    @apply text-2xl font-bold mb-4 mt-8 pb-1 border-b border-base-200;
  }

  .markdown-body :global(h3) {
    @apply text-xl font-bold mb-3 mt-6;
  }

  .markdown-body :global(p) {
    @apply mb-4 leading-relaxed;
  }

  .markdown-body :global(ul) {
    @apply list-disc pl-6 mb-4;
  }

  .markdown-body :global(ol) {
    @apply list-decimal pl-6 mb-4;
  }

  .markdown-body :global(li) {
    @apply mb-1;
  }

  .markdown-body :global(blockquote) {
    @apply border-l-4 border-primary/30 pl-4 py-1 italic mb-4 bg-base-200/50 rounded-r;
  }

  .markdown-body :global(pre) {
    @apply bg-neutral text-neutral-content p-4 rounded-lg overflow-x-auto mb-4 font-mono text-sm;
  }

  .markdown-body :global(code:not(pre code)) {
    @apply bg-base-200 text-primary px-1.5 py-0.5 rounded font-mono text-[0.9em];
  }

  .markdown-body :global(a) {
    @apply text-primary hover:underline font-medium;
  }

  .markdown-body :global(img) {
    @apply max-w-full h-auto rounded-lg shadow-md my-6;
  }

  .markdown-body :global(table) {
    @apply w-full border-collapse mb-4;
  }

  .markdown-body :global(th), .markdown-body :global(td) {
    @apply border border-base-300 p-2 text-left;
  }

  .markdown-body :global(th) {
    @apply bg-base-200 font-bold;
  }

  .prose-container {
    scrollbar-gutter: stable;
  }
</style>