import { convertFileSrc } from "@tauri-apps/api/core";

export class Video {
  path = $state("");
  duration = $state(0);
  width = $state(0);
  height = $state(0);
  loaded = $state(false);
  src = $state("");
  error = $state<string | null>(null);
  clipStart = $state(0)
  clipEnd = $state(0)
  videoBind = $state<null | HTMLVideoElement>(null)

  constructor(path: string) {
    this.path = path;
  }

  async load() {
    return new Promise<void>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        this.duration = video.duration;
        this.width = video.videoWidth;
        this.height = video.videoHeight;
        this.loaded = true;
        this.clipEnd = video.duration

        video.remove();
        resolve();
      };

      video.onerror = () => {
        this.error = "Failed to load video metadata";
        video.remove();
        reject(new Error(this.error));
      };
      

      const src = convertFileSrc(this.path);
      video.src = src;
      this.src = src;
    });
  }
}
