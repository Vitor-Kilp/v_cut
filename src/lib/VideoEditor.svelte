<script lang="ts">
  import { getGalleryContext } from "./stores/galleryStore.svelte";
  import VideoOptions from "./VideoOptions.svelte";
  import { Slider } from "./components/ui/slider";
  import { fade } from "svelte/transition";
  import Button from "./components/ui/button/button.svelte";

  const gallery = getGalleryContext();
  let selectedtime = $state([0, 0]);
  let showComponent = $state(false);
  let previewListener = $state<null | number>(null);

  $effect(() => {
    if (gallery.selectedVideo) {
      selectedtime = [
        gallery.selectedVideo.clipStart ?? 0,
        gallery.selectedVideo.clipEnd ??
          gallery.selectedVideo.videoBind?.duration,
      ];
    }
  });


function handleSliderChange(value: number[]) {
    if (gallery.selectedVideo == null) return;
    selectedtime = value;
    gallery.selectedVideo.clipStart = value[0];
    gallery.selectedVideo.clipEnd = value[1];
    if (gallery.selectedVideo.videoBind) {
      gallery.selectedVideo.videoBind.currentTime = value[0];
    }
  }

  $effect(() => {
    gallery.videos[gallery.selectedIndex].src;
    showComponent = false;
  });

  function handlePreview() {
    if (!gallery.selectedVideo.videoBind) return;

    if (previewListener) clearTimeout(previewListener);
    gallery.selectedVideo.videoBind.currentTime = selectedtime[0];
    gallery.selectedVideo.videoBind.play();

    previewListener = setInterval(() => {
      if (
        gallery.selectedVideo.videoBind &&
        gallery.selectedVideo.videoBind.currentTime >= selectedtime[1]
      ) {
        gallery.selectedVideo.videoBind.pause();
      }
    }, 100);
  }
</script>

<div class="flex flex-col justify-center h-full">
  {#if gallery.selectedVideo != null}
    {#key gallery.videos[gallery.selectedIndex].src}
      <div
        class="flex flex-col items-center w-full h-full"
        in:fade={{ duration: 200 }}
      >
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={gallery.selectedVideo.videoBind}
          class="flex flex-10 min-h-0 object-contain aspect-video border rounded-md"
          src={gallery.videos[gallery.selectedIndex].src}
          controls
          onload={() => {
            showComponent = true;
          }}
        >
        </video>
        <div class="flex w-full justify-center py-4">
          <Slider
            type="multiple"
            class="cursor-pointer"
            bind:value={selectedtime}
            onValueCommit={handleSliderChange}
            max={gallery.selectedVideo.duration}
            step={0.1}
          />
        </div>
        <Button class="cursor-pointer" onclick={handlePreview}>Preview</Button>
        <VideoOptions />
      </div>
    {/key}
  {:else}
    <p>Oops Something went wrong! Try restarting the app</p>
  {/if}
</div>
