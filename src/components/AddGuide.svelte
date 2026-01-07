<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { markdown } from '@codemirror/lang-markdown';
  import { marked } from 'marked';
  import { getGuidesDir } from '../lib/opfs';

  type Props = {
    onguideadded: () => void;
    oncancel: () => void;
  };

  let { onguideadded, oncancel }: Props = $props();

  let title = $state('');
  let content = $state('');
  let isLoading = $state(false);
  let editorElement: HTMLElement;
  let editorView: EditorView | null = null;

  const canSubmit = $derived(title.trim().length > 0 && content.trim().length > 0 && !isLoading);

  // Reactive preview HTML
  const previewHtml = $derived(
    content ? marked.parse(`# ${title || 'Untitled'}\n\n${content}`) : '<p class="placeholder">Start typing to see preview...</p>'
  );

  onMount(() => {
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

      onguideadded();
    } catch (error) {
      console.error('Failed to add guide:', error);
      alert('Failed to add guide. Please try again.');
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

<main class="new-guide-container">
  <div class="toolbar">
    <div class="toolbar-left">
      <h2 class="toolbar-title">Create New Guide</h2>
    </div>
    <div class="toolbar-right">
      <button
        class="btn btn-secondary"
        onclick={oncancel}
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
        {isLoading ? 'Creating...' : '💾 Create Guide'}
      </button>
    </div>
  </div>

  <div class="title-bar">
    <input
      class="title-input"
      placeholder="Guide Title"
      bind:value={title}
      disabled={isLoading}
      required
    />
  </div>

  <div class="editor-preview-container">
    <div class="editor-panel">
      <div class="panel-header">
        <h3>Editor</h3>
        <span class="hint">Markdown supported</span>
      </div>
      <div class="editor-wrapper">
        <div bind:this={editorElement} class="editor"></div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="preview-panel">
      <div class="panel-header">
        <h3>Preview</h3>
        <span class="hint">Live preview</span>
      </div>
      <div class="preview-wrapper">
        <article class="preview-content">
          {@html previewHtml}
        </article>
      </div>
    </div>
  </div>
</main>

<style>
  .new-guide-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #ffffff;
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

  .toolbar-left {
    flex: 1;
  }

  .toolbar-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .toolbar-right {
    display: flex;
    gap: 0.75rem;
  }

  .title-bar {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #ffffff;
  }

  .title-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1.5rem;
    font-weight: 600;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .title-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .title-input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }

  .title-input::placeholder {
    color: #9ca3af;
  }

  .editor-preview-container {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .editor-panel,
  .preview-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hint {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .editor-wrapper,
  .preview-wrapper {
    flex: 1;
    overflow: auto;
  }

  .editor {
    height: 100%;
  }

  .editor :global(.cm-editor) {
    height: 100%;
  }

  .editor :global(.cm-scroller) {
    overflow: auto;
    padding: 1rem;
  }

  .divider {
    width: 1px;
    background: #e5e7eb;
    flex-shrink: 0;
  }

  .preview-content {
    max-width: 48rem;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    width: 100%;
  }

  .preview-content :global(.placeholder) {
    color: #9ca3af;
    font-style: italic;
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

  .preview-content :global(blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 0 0 1rem;
    color: #6b7280;
    font-style: italic;
  }

  .preview-content :global(a) {
    color: #3b82f6;
    text-decoration: underline;
  }

  .preview-content :global(a:hover) {
    color: #2563eb;
  }

  .btn {
    padding: 0.625rem 1.25rem;
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
</style>