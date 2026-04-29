import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getContext, setContext } from "svelte";

export class FFmpegRunner {
  private processId: string;
  private unlisteners: Array<() => void> = [];

  totalDuration = $state(0);
  state = $state<"running" | "completed" | "waiting" | "failed" | "canceled">(
    "waiting",
  );
  progress = $state(0);
  message = $state("Waiting");
  savePath = $state("");
  activityLog = $state<string[]>(["No logs yet"]);

  constructor() {
    this.processId = `ffmpeg-${Date.now()}`;
  }

  /// Call this function before running a new command
  setup(totalDuration: number, savePath: string) {
    this.totalDuration = totalDuration;
    this.savePath = savePath;
    this.message = "Waiting";
    this.state = "waiting";
    this.progress = 0;
  }

  async run(args: string[]): Promise<void> {
    const FFmpegOutputUnlisten = await listen<FfmpegProgress>(
      "ffmpeg-output",
      (event) => {
        if (event.payload.process_id === this.processId) {
          this.activityLog.push(event.payload.line);
        }
      },
    );
    this.unlisteners.push(FFmpegOutputUnlisten);

    const progressUnlisten = await listen<FfmpegProgress>(
      "ffmpeg-progress",
      (event) => {
        if (event.payload.process_id === this.processId) {
          this.onProgress(event.payload.line, event.payload.pass);
        }
      },
    );
    this.unlisteners.push(progressUnlisten);

    const completeUnlisten = await listen<FfmpegComplete>(
      "ffmpeg-complete",
      (event) => {
        if (event.payload.process_id === this.processId) {
          this.onComplete(event.payload.success);
          this.cleanup();
        }
      },
    );
    this.unlisteners.push(completeUnlisten);

    const errorUnlisten = await listen<FfmpegError>("ffmpeg-error", (event) => {
      if (event.payload.process_id === this.processId) {
        this.onError(event.payload.error);
        this.cleanup();
      }
    });
    this.unlisteners.push(errorUnlisten);

    try {
      this.state = "running";
      this.message = "Running FFmepg";
      await invoke("run_ffmpeg", {
        processId: this.processId,
        args,
      });
    } catch (error) {
      this.state = "failed";
      this.activityLog.push(`Failed to start ffmpeg: ${error}`);
      this.cleanup();
      throw error;
    }
  }

  async run2Pass(pass1Args: string[], pass2Args: string[]): Promise<void> {
    const FFmpegOutputUnlisten = await listen<FfmpegProgress>(
      "ffmpeg-output",
      (event) => {
        if (event.payload.process_id === this.processId) {
          this.activityLog.push(event.payload.line);
        }
      },
    );
    this.unlisteners.push(FFmpegOutputUnlisten);

    const passStartUnlisten = await listen<FfmpegPassStart>(
      "ffmpeg-pass-start",
      (event) => {
        if (event.payload.process_id === this.processId) {
          this.onPassStart(event.payload.pass);
        }
      },
    );
    this.unlisteners.push(passStartUnlisten);

    const passCompleteUnlisten = await listen<FfmpegPassComplete>(
      "ffmpeg-pass-complete",
      (event) => {
        if (event.payload.process_id === this.processId) {
          this.onPassComplete(event.payload.pass, event.payload.success);
        }
      },
    );
    this.unlisteners.push(passCompleteUnlisten);

    const progressUnlisten = await listen<FfmpegProgress>(
      "ffmpeg-progress",
      (event) => {
        if (event.payload.process_id === this.processId) {
          this.onProgress(event.payload.line, event.payload.pass);
        }
      },
    );
    this.unlisteners.push(progressUnlisten);

    const completeUnlisten = await listen<FfmpegComplete>(
      "ffmpeg-complete",
      (event) => {
        if (event.payload.process_id === this.processId) {
          this.onComplete(event.payload.success);
          this.cleanup();
        }
      },
    );
    this.unlisteners.push(completeUnlisten);

    const errorUnlisten = await listen<FfmpegError>("ffmpeg-error", (event) => {
      if (event.payload.process_id === this.processId) {
        this.onError(event.payload.error);
        this.cleanup();
      }
    });
    this.unlisteners.push(errorUnlisten);

    try {
      this.state = "running";
      await invoke("run_ffmpeg_2pass", {
        processId: this.processId,
        pass1Args,
        pass2Args,
      });
    } catch (error) {
      this.state = "failed";
      this.activityLog.push(`Failed to start ffmpeg 2-pass: ${error}`);
      this.cleanup();
      throw error;
    }
  }

  async cancel(): Promise<void> {
    try {
      this.state = "canceled";
      await invoke("cancel_ffmpeg", { processId: this.processId });
      this.cleanup();
    } catch (error) {
      this.state = "failed";
      this.activityLog.push(`Failed to cancel ffmpeg: ${error}`);
    }
  }

  private onPassStart(pass: number): void {
    this.message = `Running #${pass} Pass`;
    this.activityLog.push(`Pass #${pass} started`);
  }

  private onPassComplete(pass: number, success: boolean): void {
    if (success) this.message = `Completed ${pass} Pass`;
    if (!success) this.message = `Error at Pass ${pass}`;
    this.activityLog.push(
      `Pass ${pass} completed:`,
      success ? "success" : "failed",
    );
  }

  private onProgress(line: string, pass?: number): void {
    const passInfo = pass ? ` (Pass ${pass})` : "";
    this.activityLog.push(`Progress ${passInfo}:`, line);

    const timeMatch = line.match(/time=(\d+:\d+:\d+\.\d+)/);
    //const fpsMatch = line.match(/fps=\s*(\d+)/);
    //const bitrateMatch = line.match(/bitrate=\s*([\d.]+\w+\/s)/);

    if (timeMatch) {
      this.progress =
        (this.timeToSeconds(timeMatch[1]) / this.totalDuration) * 100;
      //this.activityLog.push("Current progress: ", this.progress.toString());
      //this.activityLog.push("Current time:", timeMatch[1]);
    }
    // if (fpsMatch) {
    //   this.activityLog.push("FPS:", fpsMatch[1]);
    // }
    // if (bitrateMatch) {
    //   this.activityLog.push("Bitrate:", bitrateMatch[1]);
    // }
  }

  private onComplete(success: boolean): void {
    this.message = "Finished";
    this.state = "completed";
    this.activityLog.push("FFmpeg completed:", success ? "success" : "failed");
  }

  private onError(error: string): void {
    this.message = "Error";
    this.state = "failed";
    this.activityLog.push("FFmpeg error:", error);
  }

  private cleanup(): void {
    this.unlisteners.forEach((unlisten) => unlisten());
    this.unlisteners = [];
  }

  private timeToSeconds(time: string) {
    return time
      .split(":")
      .reduce((acc, val, i) => acc + parseFloat(val) * [3600, 60, 1][i], 0);
  }
}

interface FfmpegProgress {
  process_id: string;
  line: string;
  pass?: number;
}

interface FfmpegComplete {
  process_id: string;
  success: boolean;
  code: number | null;
}

interface FfmpegError {
  process_id: string;
  error: string;
}

interface FfmpegPassStart {
  process_id: string;
  pass: number;
}

interface FfmpegPassComplete {
  process_id: string;
  pass: number;
  success: boolean;
}

const ffmpegRunnerKey = Symbol("global");

export function setFFfmpegRunnerContext(ffmpegRunner?: FFmpegRunner) {
  if (ffmpegRunner) setContext(ffmpegRunnerKey, ffmpegRunner);
  else setContext(ffmpegRunnerKey, new FFmpegRunner());
}

export function getFFfmpegRunnerContext(): FFmpegRunner {
  return getContext(ffmpegRunnerKey) as FFmpegRunner;
}
