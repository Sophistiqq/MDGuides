<script lang="ts">
  import { onMount } from 'svelte';
  import { renderMarkdown, setupMarkdownListeners } from '../lib/markdown';
  import { listTrashedGuides, restoreGuide, permanentlyDeleteGuide, type TrashedGuide } from '../lib/opfs';
  import { notifications } from '../lib/notifications';
  import Dialog from './Dialog.svelte';

  type Props = {
    ontrashchanged?: () => void;
  };

  let { ontrashchanged = () => {} }: Props = $props();

  let trashedGuides = $state<TrashedGuide[]>([]);
  let selectedTrash = $state<TrashedGuide | null>(null);
  let isLoading = $state(false);
  let showEmptyConfirm = $state(false);
  let showDeleteConfirm = $state(false);

  const previewContent = $derived(
    selectedTrash ? renderMarkdown(selectedTrash.content) : ''
  );

  onMount(() => {
    loadTrash();
    return setupMarkdownListeners();
  });

  async function loadTrash() {
    trashedGuides = await listTrashedGuides();
  }

  function selectTrash(guide: TrashedGuide) {
    selectedTrash = selectedTrash?.id === guide.id ? null : guide;
  }

  async function handleRestore(guide: TrashedGuide) {
    isLoading = true;
    try {
      await restoreGuide(guide.id);
      await loadTrash();
      selectedTrash = null;
      ontrashchanged();
      notifications.success(`Restored "${guide.title}"`);
    } catch (error) {
      console.error('Failed to restore guide:', error);
      notifications.error('Failed to restore guide');
    } finally {
      isLoading = false;
    }
  }

  async function handlePermanentDelete() {
    if (!selectedTrash) return;
    const guide = selectedTrash;

    isLoading = true;
    try {
      await permanentlyDeleteGuide(guide.id);
      await loadTrash();
      selectedTrash = null;
      notifications.success(`Permanently deleted "${guide.title}"`);
    } catch (error) {
      console.error('Failed to delete guide:', error);
      notifications.error('Failed to delete guide');
    } finally {
      isLoading = false;
      showDeleteConfirm = false;
    }
  }

  async function handleEmptyTrash() {
    isLoading = true;
    try {
      for (const guide of trashedGuides) {
        await permanentlyDeleteGuide(guide.id);
      }
      await loadTrash();
      selectedTrash = null;
      notifications.success('Trash emptied');
    } catch (error) {
      console.error('Failed to empty trash:', error);
      notifications.error('Failed to empty trash');
    } finally {
      isLoading = false;
      showEmptyConfirm = false;
    }
  }
</script>

<div class="flex-1 flex flex-col bg-base-100 overflow-hidden min-h-0">
  <header class="navbar flex-none bg-error/10 border-b border-error/20 px-4 min-h-[4rem]">
    <div class="flex-1">
      <h2 class="text-lg font-bold text-error flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        Trash Bin
      </h2>
    </div>
    <div class="flex-none">
      {#if trashedGuides.length > 0}
        <button
          class="btn btn-error btn-sm"
          onclick={() => showEmptyConfirm = true}
          disabled={isLoading}
        >
          Empty Trash
        </button>
      {/if}
    </div>
  </header>

  <div class="flex-1 flex min-h-0 overflow-hidden">
    <div class="w-80 flex flex-col border-r border-base-300 bg-base-200 overflow-hidden">
      {#if trashedGuides.length === 0}
        <div class="flex-1 flex items-center justify-center p-8 text-center text-base-content/30 italic">
          Trash is empty
        </div>
      {:else}
        <div class="flex-1 overflow-auto p-2">
          <ul class="menu menu-sm p-0 gap-1">
            {#each trashedGuides as guide (guide.id)}
              <li>
                <button
                  class="flex flex-col items-start gap-1 p-3 {selectedTrash?.id === guide.id ? 'active' : ''}"
                  onclick={() => selectTrash(guide)}
                  disabled={isLoading}
                >
                  <span class="font-bold text-sm w-full truncate">{guide.title}</span>
                  <span class="text-[10px] opacity-60">
                    Deleted: {new Date(guide.deletedAt).toLocaleString()}
                  </span>
                </button>
                
                {#if selectedTrash?.id === guide.id}
                  <div class="flex gap-1 p-1 mt-1 w-full">
                    <button
                      class="btn btn-primary btn-xs flex-1"
                      onclick={() => handleRestore(guide)}
                      disabled={isLoading}
                    >
                      Restore
                    </button>
                    <button
                      class="btn btn-error btn-xs flex-1"
                      onclick={() => showDeleteConfirm = true}
                      disabled={isLoading}
                    >
                      Delete Forever
                    </button>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <div class="flex-1 min-h-0 overflow-auto bg-base-100 prose-container">
      {#if selectedTrash}
        <div class="flex-none bg-base-200 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-base-content/50 border-b border-base-300 sticky top-0 z-10">Preview</div>
        <article class="markdown-body p-8 sm:p-12 max-w-4xl mx-auto">
          {@html previewContent}
        </article>
      {:else}
        <div class="h-full flex items-center justify-center text-base-content/20 italic">
          Select an item to preview
        </div>
      {/if}
    </div>
  </div>
</div>

<Dialog
  bind:open={showEmptyConfirm}
  title="Empty Trash"
  confirmText="Empty All"
  onConfirm={handleEmptyTrash}
>
  <p>Are you sure you want to <strong>permanently delete all {trashedGuides.length} items</strong>? This action cannot be undone.</p>
</Dialog>

<Dialog
  bind:open={showDeleteConfirm}
  title="Permanent Delete"
  confirmText="Delete Forever"
  onConfirm={handlePermanentDelete}
>
  <p>Are you sure you want to permanently delete <strong>{selectedTrash?.title}</strong>? This action cannot be undone.</p>
</Dialog>

<style>
  @reference "../app.css";

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

  .prose-container {
    scrollbar-gutter: stable;
  }
</style>