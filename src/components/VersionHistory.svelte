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