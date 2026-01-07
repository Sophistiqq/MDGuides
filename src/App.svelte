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
  let showNewGuide = $state(false);

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
    showNewGuide = false;
  }

  function handleNewGuide() {
    showNewGuide = true;
    selectedGuideId = null;
    showTrash = false;
  }

  function handleGuideAdded() {
    showNewGuide = false;
    loadGuides();
  }

  function handleCancelNewGuide() {
    showNewGuide = false;
  }

  async function handleGuideUpdated() {
    const currentId = selectedGuideId;
    await loadGuides();
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
      showNewGuide = false;
    }
  }

  function handleTrashChanged() {
    loadGuides();
  }

  function handleGuideAction() {
    selectedGuideId = null;
    loadGuides();
  }
</script>

<div class="layout">
  <Sidebar
    {guides}
    selectedId={selectedGuideId}
    onselect={handleSelectGuide}
    onshowtrash={toggleTrash}
    onguideaction={handleGuideAction}
    onnewguide={handleNewGuide}
    {showTrash}
    {showNewGuide}
  />

  <div class="main">
    {#if showTrash}
      <TrashBin ontrashchanged={handleTrashChanged} />
    {:else if showNewGuide}
      <AddGuide 
        onguideadded={handleGuideAdded}
        oncancel={handleCancelNewGuide}
      />
    {:else}
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