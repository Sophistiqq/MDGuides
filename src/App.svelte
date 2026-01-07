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