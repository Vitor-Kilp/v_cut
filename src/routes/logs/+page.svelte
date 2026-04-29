<script lang="ts">
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { getFFfmpegRunnerContext } from "$lib/stores/runFFmpeg.svelte";

  const runner = getFFfmpegRunnerContext();
  let scrollArea: Element;

  $effect(() => {
    const _ = runner.activityLog.length;
    if (scrollArea) scrollToBottom(scrollArea);
  });

  const scrollToBottom = async (node: Element) => {
    node.scroll({ top: node.scrollHeight, behavior: "smooth" });
  };
</script>

<div bind:this={scrollArea} class="py-2 px-20 overflow-y-scroll h-screen">
  {#each runner.activityLog as log}
    <div class="text-neutral-400 py-0.5">{log}</div>
    <Separator />
  {/each}
</div>
