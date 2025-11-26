<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import Checkbox from "$lib/components/ui/checkbox/checkbox.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import { getGlobalSettingsContext } from "$lib/stores/globalSettings.svelte";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  const settings = getGlobalSettingsContext();

  $effect(() => {
    console.log(settings.clipSavePath);
  });

</script>

<div class={`flex flex-col w-full py-8 px-20 gap-6`}>
  <div class="space-x-4 space-y-6">
    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label for="clips-path">Default Save Path</Label>
      {#if settings.isPathReady}
        <Input id="clips-path" type="text" bind:value={settings.clipSavePath} />
      {:else}
        <p class="text-muted-foreground text-sm">Loading path...</p>
      {/if}
      <p class="text-muted-foreground text-sm">
        The default path to save clips
      </p>
    </div>
    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label for="clips-index">Clip Index</Label>
      <Input
        id="clips-index"
        type="number"
        bind:value={settings.clipSaveIndex}
      />
      <p class="text-muted-foreground text-sm">The current clip number</p>
    </div>
    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <Label class="cursor-pointer" for="prefix">Prefix to save</Label>
      <Input id="prefix" type="text" bind:value={settings.clipSavePrefix} />
      <p class="text-muted-foreground text-sm">
        The prefix name of the saved clips
      </p>
    </div>
    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <div class="inline-flex gap-x-2">
        <Checkbox id="ask-confirmation" bind:checked={settings.askToSave} />
        <Label for="ask-confirmation">Ask for save file confirmation</Label>
      </div>
      <p class="text-muted-foreground text-sm">
        Should a popup appear when saving clips
      </p>
    </div>
    <div class="flex w-full max-w-sm flex-col gap-1.5">
      <div class="inline-flex gap-x-2" id="theme">
        <ThemeToggle />
        <Label for="theme">Change theme</Label>
      </div>
      <p class="text-muted-foreground text-sm">Dark and Light mode available</p>
    </div>
  </div>
  <div>
    <Button onclick={() => settings.reset()}>Reset to Defaults</Button>
    <Button onclick={() => settings.save()}>Save Changes</Button>
  </div>
</div>
