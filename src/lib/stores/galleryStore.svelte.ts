import { getContext, setContext } from "svelte";
import type { Video } from "./videoStore.svelte";

class Gallery {
  videos = $state<Video[]>([]);
  selectedIndex = $state(-1);
  selectedVideo = $derived(this.videos[this.selectedIndex]);

  addVideo(video: Video) {
    this.videos.push(video);
    video.load();
    this.selectedIndex = this.videos.length - 1;
  }

  removeVideo(index: number) {
    this.videos.splice(index, 1)
  }

}

const galleryKey = Symbol("gallery");

export function setGalleryContext(gallery?: Gallery) {
  if (gallery) setContext(galleryKey, gallery);
  else setContext(galleryKey, new Gallery());
}

export function getGalleryContext(): Gallery {
  return getContext(galleryKey) as Gallery;
}
