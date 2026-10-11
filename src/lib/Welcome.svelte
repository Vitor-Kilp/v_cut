<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { open } from "@tauri-apps/plugin-dialog";
  import Button from "./components/ui/button/button.svelte";
  import { Input } from "./components/ui/input";
  import { Label } from "./components/ui/label";
  import { getGalleryContext } from "./stores/galleryStore.svelte";
  import { Video } from "./stores/videoStore.svelte";

  const gallery = getGalleryContext();
  let files: FileList | undefined = $state();

  async function handleFileSelect() {
    const files = await open({
      multiple: true,
      filters: [
        {
          extensions: [
            "mp4",
            "mov",
            "avi",
            "mkv",
            "wmv",
            "flv",
            "m4v",
            "webm",
            "3gp",
            "mpeg",
            "mpg",
          ],
          name: "videos",
        },
      ],
    });

    if (!files) return;

    for (const file of files) {
      gallery.addVideo(new Video(file));
    }
  }

</script>

<div class="w-full h-full flex items-center justify-center">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title>Drop a video here to start</Card.Title>
      <Card.Description
        >Your added videos will appear in the sidebar</Card.Description
      >
    </Card.Header>
    <Card.Content>
      <form>
        <div class="flex flex-col gap-6">
          <div class="grid gap-2">
            <div class="flex items-center">
              <Label for="file">Or select them manually below</Label>
            </div>
            <Button onclick={handleFileSelect}>Select Files</Button>
          </div>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
