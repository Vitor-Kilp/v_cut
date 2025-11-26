<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
  } from "$lib/components/ui/sidebar/index.js";
  import Gallery from "$lib/Gallery.svelte";
  import Sidebar from "$lib/Sidebar.svelte";
  import { setFormSettingsContext } from "$lib/stores/formStore.svelte";
  import { setGalleryContext } from "$lib/stores/galleryStore.svelte";
  import { setGlobalSettingsContext } from "$lib/stores/globalSettings.svelte";
  import { fade } from "svelte/transition";
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import type { LayoutProps } from "./$types";
  import Dropzone from "$lib/Dropzone.svelte";
  import { setFFfmpegRunnerContext } from "$lib/stores/runFFmpeg.svelte";
  import ProgressDialog from "$lib/ProgressDialog.svelte";

  let { children, data }: LayoutProps = $props();


  setGalleryContext();
  setFormSettingsContext();
  setGlobalSettingsContext();
  setFFfmpegRunnerContext()
</script>

<SidebarProvider>
  <ProgressDialog />
  <ModeWatcher />
  <Sidebar>
    <Gallery></Gallery>
  </Sidebar>{#key data.pathname}
    <div
      class={`absolute transition-all duration-300 ease-in-out ${useSidebar().open ? "top-0 right-0 bottom-0 md:left-[255px] left-0" : "inset-0"}`}
      in:fade={{ duration: 100, delay: 100 }}
      out:fade={{ duration: 100, delay: 0 }}
    >
      {@render children()}
    </div>
  {/key}
  <Dropzone />
</SidebarProvider>
