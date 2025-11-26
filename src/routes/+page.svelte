<script lang="ts">
  import Dropzone from "$lib/Dropzone.svelte";
  import { getGalleryContext } from "$lib/stores/galleryStore.svelte";
  import VideoEditor from "$lib/VideoEditor.svelte";
  import Welcome from "$lib/Welcome.svelte";
  import { invoke } from "@tauri-apps/api/core";

  let name = $state("");
  let greetMsg = $state("");
  const gallery = getGalleryContext();

  async function greet(event: Event) {
    event.preventDefault();
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    greetMsg = await invoke("greet", { name });
  }
</script>

<main class="flex flex-col dark w-full h-full max-h-[calc(100vh-3.5rem)] my-14 px-4">
  {#if gallery.selectedVideo != null}
    <VideoEditor />
  {:else}
    <Welcome />
  {/if}
</main>
