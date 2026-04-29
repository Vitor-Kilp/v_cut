<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { openPath } from "@tauri-apps/plugin-opener";
  import Button from "./components/ui/button/button.svelte";
  import Progress from "./components/ui/progress/progress.svelte";
  import { getFFfmpegRunnerContext } from "./stores/runFFmpeg.svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { toast } from "svelte-sonner";

  let open = $state(false);
  let copied = $state(false);
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
    if (runner.state == "waiting") copied = false;
  });

  function callToast() {
    if (!open && (runner.state === "running" || runner.state === "waiting")) {
      toast("Still running on background", {
        action: {
          label: "Show again",
          onClick: () => open = true
        },
        dismissible: false,
        duration: 10000,
      });
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={callToast}>
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
        <Button class="cursor-pointer" onclick={() => runner.cancel()}
          >Cancel</Button
        >
      {:else if runner.state === "completed"}
        <div class="flex justify-between w-full">
          <div>
            <Button
              class="cursor-pointer"
              onclick={() => openPath(runner.savePath)}>Play</Button
            >
            <Button
              class="cursor-pointer"
              onclick={async () => {
                try {
                  await invoke("copy_file_to_clipboard", {
                    filePath: runner.savePath,
                  });
                  copied = true;
                } catch {
                  console.log("Error copying to clipboard");
                }
              }}>{copied ? "Copied!" : "Copy"}</Button
            >
          </div>
          <Button class="cursor-pointer" onclick={() => open = false}
            >Close</Button
          >
        </div>
      {:else}
        <Button class="cursor-pointer" onclick={() => open = false}
          >Close</Button
        >
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
