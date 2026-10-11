<script lang="ts">
  import { Slider } from "$lib/components/ui/slider/index.js";
  import { getGalleryContext } from "./stores/galleryStore.svelte";
  import * as Form from "$lib/components/ui/form/index.js";
  import { superForm } from "sveltekit-superforms";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import {
    encoders,
    encodingModes,
    ffmpegSchema,
    fps,
    getPresetsForEncoder,
    resolutions,
  } from "./formSchema";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Input } from "./components/ui/input";
  import {
    FFmpegCommand,
    type FilterChain,
    type VideoCodecs,
  } from "./stores/ffmpegCommand.svelte";
  import { save } from "@tauri-apps/plugin-dialog";
  import { path } from "@tauri-apps/api";
  import { getFormSettingsContext } from "./stores/formStore.svelte";
  import { getGlobalSettingsContext } from "./stores/globalSettings.svelte";
  import { getFFfmpegRunnerContext } from "./stores/runFFmpeg.svelte";
  import { Button } from "./components/ui/button";

  const gallery = getGalleryContext();
  const formStore = getFormSettingsContext();
  const globalSettings = getGlobalSettingsContext();
  const runner = getFFfmpegRunnerContext();
  let previewListener = $state<null | ReturnType<typeof setInterval>>(null);

  const defaults = {
    mode: "two-pass",
    encoder: "libx264",
    preset: "medium",
    crf: 23,
    bitrate: 10,
    size: 9,
    resolution: "1080",
    fps: "source",
  };

  const settings = { ...defaults, ...formStore.value };

  const form = superForm(settings, {
    SPA: true,
    resetForm: false,
    clearOnSubmit: "none",
    validators: zod4Client(ffmpegSchema),
    onUpdate: ({ form }) => {
      if (form.valid) {
        handleSubmit();
      }
    },
  });

  const { form: formData, enhance } = form;

  async function handleSubmit() {
    if (!gallery.selectedVideo) return;

    const defaultPath = await path.join(
      globalSettings.clipSavePath,
      `${globalSettings.clipSavePrefix}${globalSettings.clipSaveIndex}.mp4`,
    );

    const extensions = ["mp4", "mov", "mkv", "flv", "f4v", "avi"];

    let savePath = await save({
      defaultPath,
      filters: [
        {
          name: "Video",
          extensions,
        },
      ],
    });

    if (!savePath) return;

    globalSettings.clipSaveIndex += 1;

    const passlog = await path.join(await path.appCacheDir(), "passlog");

    const start = gallery.selectedVideo.clipStart.toString();
    const end = gallery.selectedVideo.clipEnd.toString();

    const videoTrim: FilterChain = {
      inputs: ["0:v"],
      outputs: ["1:v"],
      filters: [
        { name: "trim", args: [{ start, end }] },
        { name: "setpts", args: [{ expr: "PTS-STARTPTS" }] },
      ],
    };

    const scaleFilter: FilterChain = {
      inputs: ["1:v"],
      outputs: ["vout"],
      filters: [
        { name: "scale", args: [`-1:${$formData.resolution}`] },
        {
          name: "pad", // Padding needed in case video width/height is odd
          args: ["ceil(iw/2)*2:ceil(ih/2)*2"],
        },
      ],
    };

    const AudioTrim: FilterChain = {
      inputs: ["0:a"],
      outputs: ["aout"],
      filters: [
        { name: "atrim", args: [{ start, end }] },
        { name: "asetpts", args: [{ expr: "PTS-STARTPTS" }] },
      ],
    };

    const crf = $formData.mode === "crf" ? $formData.crf : undefined;
    const bitrate =
      $formData.mode === "cbr" ? `${$formData.bitrate}M` : undefined;
    const fps = $formData.fps == "source" ? undefined : $formData.fps;

    const ff = new FFmpegCommand({
      inputs: [
        {
          path: gallery.selectedVideo.path,
        },
      ],
      globalFilterGraphs: [scaleFilter, videoTrim, AudioTrim],
      output: {
        overwrite: true,
        crf,
        bitrate,
        fps,
        path: savePath,
        videoCodec: $formData.encoder as VideoCodecs,
        preset: $formData.preset,
        twoPass: {
          enabled: $formData.mode === "two-pass",
          targetSizeHuman: `${$formData.size}M`,
          passlogfile: passlog,
          audioBitrateKbps: 128,
        },
        maps: ["[vout]", "[aout]"],
      },
    });

    const totalVideoDuration =
      gallery.selectedVideo.clipEnd - gallery.selectedVideo.clipStart;

    const [part1, part2] = ff.buildCommand(totalVideoDuration);

    runner.setup(totalVideoDuration, savePath);

    if (part2.length === 0) runner.run(part1);
    else runner.run2Pass(part1, part2);
  }

  function handleEncoderChange(value: (typeof encoders)[number]) {
    $formData.encoder = value;
    const presets = getPresetsForEncoder(value);
    $formData.preset = presets[Math.ceil(presets.length / 2)] as any;
  }

  $effect(() => {
    formStore.set($formData);
    return () => {
      if (previewListener) {
        clearInterval(previewListener);
        previewListener = null;
      }
    };
  });

  function handlePreview() {
    if (!gallery.selectedVideo.videoBind) return;

    if (previewListener) clearInterval(previewListener);
    gallery.selectedVideo.videoBind.currentTime =
      gallery.selectedVideo.clipStart;
    gallery.selectedVideo.videoBind.play();

    previewListener = setInterval(() => {
      if (
        gallery.selectedVideo.videoBind &&
        gallery.selectedVideo.videoBind.currentTime >=
          gallery.selectedVideo.clipEnd
      ) {
        gallery.selectedVideo.videoBind.pause();
      }
    }, 100);
  }
</script>

<div class="flex flex-col space-y-6 w-full py-4 flex-1">
  {#if gallery.selectedVideo != null}
    <form
      use:enhance
      class="flex items-end justify-start flex-wrap gap-x-4 gap-y-6"
    >
      <Form.Field {form} name="mode">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Mode</Form.Label>
            <Select.Root
              type="single"
              bind:value={$formData.mode}
              name={props.name}
            >
              <Select.Trigger {...props} class="cursor-pointer">
                {$formData.mode}
              </Select.Trigger>
              <Select.Content>
                {#each encodingModes as mode}
                  <Select.Item
                    value={mode}
                    label={mode}
                    class="cursor-pointer"
                  />
                {/each}
              </Select.Content>
            </Select.Root>
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
      <Form.Field {form} name="resolution">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Resolution</Form.Label>
            <Select.Root
              type="single"
              bind:value={$formData.resolution}
              name={props.name}
            >
              <Select.Trigger {...props} class="cursor-pointer">
                {`${$formData.resolution}p`}
              </Select.Trigger>
              <Select.Content>
                {#each resolutions as resolution}
                  <Select.Item
                    value={resolution}
                    label={`${resolution}p`}
                    class="cursor-pointer"
                  />
                {/each}
              </Select.Content>
            </Select.Root>
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
      <Form.Field {form} name="fps">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>FPS</Form.Label>
            <Select.Root
              type="single"
              bind:value={$formData.fps}
              name={props.name}
            >
              <Select.Trigger {...props} class="cursor-pointer">
                {`${$formData.fps}`}
              </Select.Trigger>
              <Select.Content>
                {#each fps as fpsOption}
                  <Select.Item
                    value={fpsOption}
                    label={`${fpsOption}`}
                    class="cursor-pointer"
                  />
                {/each}
              </Select.Content>
            </Select.Root>
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
      <Form.Field {form} name="encoder">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Encoder</Form.Label>
            <Select.Root
              type="single"
              bind:value={$formData.encoder}
              name={props.name}
              onValueChange={(e) =>
                handleEncoderChange(e as (typeof encoders)[number])}
            >
              <Select.Trigger {...props} class="cursor-pointer">
                {$formData.encoder}
              </Select.Trigger>
              <Select.Content>
                {#each encoders as encoder}
                  <Select.Item
                    value={encoder}
                    label={encoder}
                    class="cursor-pointer"
                  />
                {/each}
              </Select.Content>
            </Select.Root>
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
      <Form.Field {form} name="preset">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Preset</Form.Label>
            <Select.Root
              type="single"
              bind:value={$formData.preset}
              name={props.name}
            >
              <Select.Trigger {...props} class="cursor-pointer">
                {$formData.preset}
              </Select.Trigger>
              <Select.Content>
                {#each getPresetsForEncoder($formData.encoder as (typeof encoders)[number]) as preset}
                  <Select.Item
                    value={preset}
                    label={preset}
                    class="cursor-pointer"
                  />
                {/each}
              </Select.Content>
            </Select.Root>
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
      {#if $formData.mode === "crf"}
        <Form.Field {form} name="crf" class="w-[140px]">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>CRF</Form.Label>
              <Input
                type="number"
                bind:value={$formData.crf}
                placeholder={"CRF value"}
              />
              <Slider
                {...props}
                type="single"
                max={51}
                min={1}
                bind:value={$formData.crf}
              ></Slider>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
      {/if}
      {#if $formData.mode === "cbr"}
        <Form.Field {form} name="bitrate" class="w-[140px]">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Constant Bitrate</Form.Label>
              <Input
                type="number"
                bind:value={$formData.bitrate}
                placeholder={"Bitrate value"}
              />
              <Slider
                {...props}
                type="single"
                max={100}
                min={1}
                bind:value={$formData.bitrate}
              ></Slider>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
      {/if}
      {#if $formData.mode === "two-pass"}
        <Form.Field {form} name="size" class="w-[140px] cursor-pointer">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Size in Mb</Form.Label>
              <Input
                type="number"
                bind:value={$formData.size}
                placeholder={"Desired video size"}
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
      {/if}
      <Button class="mb-2 cursor-pointer" onclick={handlePreview}
        >Preview</Button
      >
      <Form.Button class="mb-2 cursor-pointer">Cut</Form.Button>
    </form>
  {/if}
</div>
