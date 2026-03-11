<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { markdown } from '@codemirror/lang-markdown';
  import { renderMarkdown, setupMarkdownListeners } from '../lib/markdown';
  import { getGuidesDir } from '../lib/opfs';
  import { notifications } from '../lib/notifications';

  type Props = {
    onguideadded: () => void;
    oncancel: () => void;
  };

  let { onguideadded, oncancel }: Props = $props();

  let title = $state('');
  let content = $state('');
  let isLoading = $state(false);
  let editorElement = $state<HTMLElement>();
  let editorView = $state<EditorView | null>(null);

  const canSubmit = $derived(title.trim().length > 0 && content.trim().length > 0 && !isLoading);

  // Reactive preview HTML
  const previewHtml = $derived(
    content ? renderMarkdown(`# ${title || 'Untitled'}\n\n${content}`) : '<p class="text-base-content/40 italic">Start typing to see preview...</p>'
  );

  onMount(() => {
    const cleanup = setupMarkdownListeners();
    // Initialize editor
    if (editorElement) {
      editorView = new EditorView({
        state: EditorState.create({
          doc: '',
          extensions: [
            basicSetup,
            markdown(),
            EditorView.lineWrapping,
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                content = update.state.doc.toString();
              }
            })
          ]
        }),
        parent: editorElement
      });
    }

    return () => {
      cleanup();
      if (editorView) {
        editorView.destroy();
      }
    };
  });

  async function handleSubmit() {
    if (!canSubmit) return;

    isLoading = true;

    try {
      const mdContent = `# ${title}\n\n${content.trim()}`;

      const dir = await getGuidesDir();
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      const fileHandle = await dir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(mdContent);
      await writable.close();

      notifications.success('Guide created successfully');
      onguideadded();
    } catch (error) {
      console.error('Failed to add guide:', error);
      notifications.error('Failed to create guide');
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      oncancel();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex-1 flex flex-col bg-base-100 overflow-hidden min-h-0">
  <header class="navbar flex-none bg-base-100 border-b border-base-300 px-4 min-h-[4rem]">
    <div class="flex-1">
      <h2 class="text-lg font-bold">Create New Guide</h2>
    </div>
    <div class="flex-none gap-2">
      <button class="btn btn-ghost btn-sm" onclick={oncancel} disabled={isLoading}>Cancel</button>
      <button class="btn btn-primary btn-sm" onclick={handleSubmit} disabled={!canSubmit}>
        {#if isLoading}<span class="loading loading-spinner loading-xs"></span>{/if}
        Create Guide
      </button>
    </div>
  </header>

  <div class="flex-none p-4 sm:px-8 border-b border-base-300 bg-base-200/50">
    <input
      type="text"
      placeholder="Enter guide title..."
      class="input input-ghost w-full text-2xl sm:text-3xl font-bold px-0 focus:bg-transparent focus:outline-none placeholder:opacity-30"
      bind:value={title}
      disabled={isLoading}
      required
    />
  </div>

  <div class="flex-1 min-h-0 flex overflow-hidden">
    <div class="flex-1 flex flex-col border-r border-base-300 overflow-hidden bg-base-100">
      <div class="flex-none bg-base-200 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-base-content/50 border-b border-base-300">Editor</div>
      <div class="flex-1 overflow-hidden" bind:this={editorElement}></div>
    </div>
    <div class="flex-1 hidden md:flex flex-col overflow-hidden bg-base-200/30">
      <div class="flex-none bg-base-200 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-base-content/50 border-b border-base-300">Preview</div>
      <div class="flex-1 min-h-0 overflow-auto p-8 prose-container">
        <article class="markdown-body">
          {@html previewHtml}
        </article>
      </div>
    </div>
  </div>
</div>

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

  .prose-container {
    scrollbar-gutter: stable;
  }
</style>