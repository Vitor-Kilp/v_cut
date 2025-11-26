<script lang="ts">
  import { getCurrentWebview } from "@tauri-apps/api/webview";
  import { getGalleryContext } from "./stores/galleryStore.svelte";
  import { Video } from "./stores/videoStore.svelte";
  import { fade } from "svelte/transition";

  const gallery = getGalleryContext();
  let hovering = $state(false);

  $effect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        event.payload.paths.map((p) => {
          gallery.addVideo(new Video(p));
        });
        hovering = false;
      } else if (event.payload.type === "enter") {
        hovering = true;
      } else if (event.payload.type === "leave") {
        hovering = false;
      }
    });

    return async () => (await unlisten)();
  });
</script>

{#if hovering}
  <div in:fade={{duration: 200, delay: 0}} out:fade={{duration: 200, delay: 0}} class="fixed bg-background inset-0 z-10 p-16">
    <div
      class="flex w-full h-full items-center justify-center rounded-md border border-dashed "
    >
      <h1 class="text-muted-foreground text-xl">Drop files here</h1>
    </div>
  </div>
{/if}
