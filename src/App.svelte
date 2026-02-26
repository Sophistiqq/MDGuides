<script lang="ts">
  import { onMount } from 'svelte';
  import Sidebar from './components/Sidebar.svelte';
  import AddGuide from './components/AddGuide.svelte';
  import GuideViewer from './components/GuideViewer.svelte';
  import TrashBin from './components/TrashBin.svelte';
  import Notification from './components/Notification.svelte';
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

<div class="flex h-screen w-full bg-base-100 overflow-hidden">
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

  <main class="flex-1 flex flex-col min-w-0 bg-base-100">
    {#if showTrash}
      <TrashBin ontrashchanged={handleTrashChanged} />
    {:else if showNewGuide}
      <AddGuide 
        onguideadded={handleGuideAdded}
        oncancel={handleCancelNewGuide}
      />
    {:else if selectedGuide}
      <GuideViewer 
        guide={selectedGuide}
        onupdated={handleGuideUpdated}
        ondeleted={handleGuideDeleted}
      />
    {:else}
      <div class="flex-1 flex flex-col items-center justify-center text-base-content/50 gap-4">
        <img src="/icon.svg" alt="Guidy Logo" class="h-24 w-24 opacity-20" />
        <p class="text-xl font-medium">Select a guide to start reading</p>
        <button class="btn btn-primary btn-sm mt-2" onclick={handleNewGuide}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create New Guide
        </button>
      </div>
    {/if}
  </main>

  <Notification />
</div>

<style>
  @reference "./app.css";

  :global(body) {
    @apply bg-base-100;
  }
</style>