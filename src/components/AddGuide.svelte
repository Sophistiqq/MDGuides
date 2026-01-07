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