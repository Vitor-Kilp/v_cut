<script>
  import { goto } from "$app/navigation";
  import Badge from "./components/ui/badge/badge.svelte";
  import { Button } from "./components/ui/button";
  import { getGalleryContext } from "./stores/galleryStore.svelte";
  import Delete from "@lucide/svelte/icons/x";
  const gallery = getGalleryContext();
</script>

<div class="flex flex-col gap-2 px-2 py-2 h-full">
  {#if gallery.videos.length > 0}
    {#each gallery.videos as video, i}
      <div class="rounded-xl relative">
        <button
          class="cursor-pointer"
          onclick={() => {
            goto("/");
            gallery.selectedIndex = i;
          }}
        >
          <!-- svelte-ignore a11y_media_has_caption -->

          <video
            class={`border object-cover rounded-2xl flex ${gallery.selectedIndex == i ? "border-primary" : ""}`}
            src={video.src}
          ></video>
        </button>
        <button
          class={`cursor-pointer absolute z-10 right-0 top-0 bg-sidebar border-t border-r ${gallery.selectedIndex == i ? "border-primary" : ""} rounded-bl-md rounded-tr-md p-1`}
          onclick={() => gallery.removeVideo(i)}><Delete /></button
        >
      </div>
    {/each}
  {:else}
    <div class="flex h-full items-center justify-center">
      <Badge variant="outline" class="text-sm">No videos added yet</Badge>
    </div>
  {/if}
</div>
