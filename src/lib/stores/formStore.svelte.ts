import { browser } from "$app/environment";
import { getContext, setContext } from "svelte";

const STORAGE_KEY = "ffmpeg-form-settings";

class FormSettingsStore {
  // TODO add typings
  value = $state<any>(null);

  constructor() {
    if (browser) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          this.value = JSON.parse(saved);
          console.log("loaded value local");
        } catch (e) {
          console.error("Failed to parse saved settings:", e);
        }
      }
    }
  }

  set(newValue: any) {
    this.value = newValue;
    if (browser) {
      console.log("set value local");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
    }
  }

  clear() {
    this.value = null;
    if (browser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

const formSettingsKey = Symbol("formSettings");

export function setFormSettingsContext(formSettings?: FormSettingsStore) {
  if (formSettings) setContext(formSettingsKey, formSettings);
  else setContext(formSettingsKey, new FormSettingsStore());
}

export function getFormSettingsContext(): FormSettingsStore {
  return getContext(formSettingsKey) as FormSettingsStore;
}
