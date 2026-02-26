<script lang="ts">
  import { onMount } from 'svelte';
  import { renderMarkdown, setupMarkdownListeners } from '../lib/markdown';
  import type { Version } from '../lib/opfs';

  type Props = {
    versions: Version[];
    onrestore: (version: Version) => void;
  };

  let { versions, onrestore }: Props = $props();

  let selectedVersion = $state<Version | null>(null);

  const previewContent = $derived(
    selectedVersion ? renderMarkdown(selectedVersion.content) : ''
  );

  function selectVersion(version: Version) {
    selectedVersion = selectedVersion?.timestamp === version.timestamp ? null : version;
  }

  onMount(() => {
    return setupMarkdownListeners();
  });
</script>

<div class="flex h-64 border-b border-base-300 bg-base-100 overflow-hidden">
  <div class="w-64 flex flex-col border-r border-base-300 bg-base-200 overflow-hidden">
    <div class="p-3 border-b border-base-300 bg-base-100 font-bold text-xs uppercase tracking-wider text-base-content/60">
      Version History
    </div>
    <div class="flex-1 overflow-auto p-2">
      {#if versions.length === 0}
        <div class="p-4 text-center text-xs opacity-40 italic">No versions yet</div>
      {:else}
        <ul class="menu menu-sm p-0 gap-1">
          {#each versions as version (version.timestamp)}
            <li>
              <button
                class="flex flex-col items-start p-3 {selectedVersion?.timestamp === version.timestamp ? 'active' : ''}"
                onclick={() => selectVersion(version)}
              >
                <span class="font-medium text-xs">
                  {new Date(version.timestamp).toLocaleString()}
                </span>
                {#if version.author}
                  <span class="text-[10px] opacity-60">by {version.author}</span>
                {/if}
              </button>
              {#if selectedVersion?.timestamp === version.timestamp}
                <button
                  class="btn btn-primary btn-xs mt-1 w-full"
                  onclick={() => onrestore(version)}
                >
                  Restore This Version
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <div class="flex-1 flex flex-col overflow-hidden bg-base-100">
    {#if selectedVersion}
      <div class="p-3 border-b border-base-300 bg-base-200 font-bold text-xs uppercase tracking-wider text-base-content/60 sticky top-0">
        Preview
      </div>
      <div class="flex-1 overflow-auto p-6 prose-container">
        <article class="markdown-body text-sm">
          {@html previewContent}
        </article>
      </div>
    {:else}
      <div class="h-full flex items-center justify-center text-base-content/20 italic text-sm">
        Select a version to preview
      </div>
    {/if}
  </div>
</div>

<style>
  @reference "../app.css";

  .markdown-body {
    line-height: 1.5;
    color: var(--color-base-content);
  }

  .markdown-body :global(h1) {
    @apply text-2xl font-bold mb-4 border-b border-base-200 pb-2;
  }

  .markdown-body :global(h2) {
    @apply text-xl font-bold mb-3 mt-4;
  }

  .markdown-body :global(p) {
    @apply mb-3;
  }

  .markdown-body :global(ul) {
    @apply list-disc pl-5 mb-3;
  }

  .prose-container {
    scrollbar-gutter: stable;
  }
</style>