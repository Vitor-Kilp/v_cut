<script lang="ts">
  import { getGalleryContext } from "./stores/galleryStore.svelte";
  import VideoOptions from "./VideoOptions.svelte";
  import { Slider } from "./components/ui/slider";
  import { fade } from "svelte/transition";

  const gallery = getGalleryContext();
  let selectedtime = $state([0.0, 0.0]);
  let showComponent = $state(false);

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
    gallery.selectedVideo?.src;
    showComponent = false;
  });

  function formatTime(sec: number): string {
    if (!Number.isFinite(sec)) return "00:00.0";

    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = Math.floor(sec % 60);
    const fraction = Math.floor((sec % 1) * 10);

    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");

    const base = `${mm}:${ss}.${fraction}`;

    return hours > 0 ? `${hh}:${base}` : base;
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
        <div class="flex flex-col w-full justify-center py-4">
          <Slider
            type="multiple"
            class="cursor-pointer"
            bind:value={selectedtime}
            onValueCommit={handleSliderChange}
            max={gallery.selectedVideo.duration}
            step={0.1}
          />
          <div class="flex w-full justify-between">
            <p>{formatTime(selectedtime[0])}</p>
            <p>{formatTime(selectedtime[1])}</p>
          </div>
        </div>
        <VideoOptions />
      </div>
    {/key}
  {:else}
    <p>Oops Something went wrong! Try restarting the app</p>
  {/if}
</div>
