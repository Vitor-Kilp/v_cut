import { browser } from "$app/environment";
import { path } from "@tauri-apps/api";
import { getContext, setContext } from "svelte";

const STORAGE_KEY = "global-settings";

const defaults = {
  clipSavePrefix: "Clip_",
  clipSaveIndex: 1,
  clipSavePath: "",
  volume: 50,
  askToSave: true,
};

class GlobalSettings {
  clipSavePrefix = $state("Clip_");
  clipSaveIndex = $state(1);
  clipSavePath = $state("");

  volume = $state(50);
  askToSave = $state(true);
  isPathReady = $state(false);

  constructor() {
    // Initialize path first
    this.initializePath();

    // Then load saved settings
    if (browser) {
      this.loadFromStorage();
    }

    if (browser) {
      $effect(() => {
        // Access all the reactive values to track them
        this.clipSavePrefix;
        this.clipSaveIndex;
        this.clipSavePath;
        this.volume;
        this.askToSave;

        // Skip saving during initial load
        if (this.isPathReady) {
          this.save();
        }
      });
    }
  }

  private async initializePath() {
    try {
      const videoPath = await path.videoDir();
      const clipsPath = await path.join(videoPath, "Clips");
      this.clipSavePath = clipsPath;
      this.isPathReady = true;
    } catch (e) {
      console.error("Failed to initialize path:", e);
    }
  }

  private loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      console.log("found saved settings");
      try {
        const parsed = JSON.parse(saved);
        this.clipSavePrefix = parsed.clipSavePrefix ?? defaults.clipSavePrefix;
        this.clipSaveIndex = parsed.clipSaveIndex ?? defaults.clipSaveIndex;
        this.askToSave = parsed.askToSave ?? defaults.askToSave;
        if (parsed.clipSavePath) {
          this.clipSavePath = parsed.clipSavePath;
        }
        this.volume = parsed.volume ?? defaults.volume;
      } catch (e) {
        console.error("Failed to parse saved settings:", e);
      }
    } else console.log("settings not found", saved);
  }

  save() {
    const data = {
      clipSavePrefix: this.clipSavePrefix,
      clipSaveIndex: this.clipSaveIndex,
      clipSavePath: this.clipSavePath,
      askToSave: this.askToSave,
      volume: this.volume,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("set value local", data);
  }

  async reset() {
    this.clipSavePrefix = defaults.clipSavePrefix;
    this.clipSaveIndex = defaults.clipSaveIndex;
    this.volume = defaults.volume;

    await this.initializePath();

    if (browser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

const globalKey = Symbol("global");

export function setGlobalSettingsContext(globalSettings?: GlobalSettings) {
  if (globalSettings) setContext(globalKey, globalSettings);
  else setContext(globalKey, new GlobalSettings());
}

export function getGlobalSettingsContext(): GlobalSettings {
  return getContext(globalKey) as GlobalSettings;
}
