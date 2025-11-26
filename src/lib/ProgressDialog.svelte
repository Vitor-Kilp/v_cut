<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { openPath } from "@tauri-apps/plugin-opener";
  import Button from "./components/ui/button/button.svelte";
  import Progress from "./components/ui/progress/progress.svelte";
  import { getFFfmpegRunnerContext } from "./stores/runFFmpeg.svelte";
  import { writeText } from "@tauri-apps/plugin-clipboard-manager";

  let open = $state(false);
  let copied = $state(false)
  const runner = getFFfmpegRunnerContext();

  $effect(() => {
    if (runner.state !== "waiting") {
      open = true;
    }

    if (runner.state === "waiting") {
      open = false;
    }
  });

  $effect(() => {
    if (runner.state == "waiting") copied = false
  })
</script>

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{runner.message}</Dialog.Title>
      <Dialog.Description>
        <p class="p-2">
          Currently {runner.state} : {runner.state === "completed"
            ? "100"
            : runner.progress.toFixed(1)}%
        </p>
        <div>
          <Progress value={runner.progress} max={100} />
        </div>
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      {#if runner.state === "running"}
        <Button class="cursor-pointer" onclick={() => runner.cancel()}>Cancel</Button>
      {:else if runner.state === "completed"}
      <div class="flex justify-between w-full">
        <div>
          <Button class="cursor-pointer" onclick={() => openPath(runner.savePath)}>Play</Button>
          <Button class="cursor-pointer" onclick={async () => {
            await writeText(`file://${runner.savePath}`)
            copied = true
            }}>{copied ? "Copied!" : "Copy"}</Button></div>
            <Button class="cursor-pointer" onclick={() => (open = false)}>Close</Button>
        </div>
      {:else}
        <Button class="cursor-pointer" onclick={() => (open = false)}>Close</Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
