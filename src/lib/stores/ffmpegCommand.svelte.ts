export interface GlobalOptions {
  overwrite?: boolean;
  hideBanner?: boolean;
  loglevel?:
    | "quiet"
    | "panic"
    | "fatal"
    | "error"
    | "warning"
    | "info"
    | "verbose"
    | "debug"
    | "trace";
  threads?: number;
  hwaccel?: "auto" | "cuda" | "dxva2" | "qsv" | "vaapi" | string;
  extra?: string[]; // any extra raw global args (keeps extensibility)
}

export type VideoCodecs =
  | "hevc_nvenc"
  | "h264_nvenc"
  | "libx264"
  | "libx265"
  | "h264_amf"
  | "hevc_amf";

type AudioCodec = "aac" | "copy";

export interface FFmpegInputOptions {
  path: string; // path or URL for -i
  format?: string; // -f
  ss?: string; // -ss (input seek)
  t?: string; // -t (input duration)
  hwaccel?: string; // input-specific hwaccel
  inputOptions?: string[]; // additional arbitrary args that must come before -i for this input
  streamIndex?: number; // e.g., -map 0:v:0 if used
  discardNonDefaultStreams?: boolean; // an app-level hint; not direct ffmpeg flag
  metadata?: Record<string, string>;
}

// Filter graph and filter objects
export interface Filter {
  // e.g. name: 'scale', args: ['1280:720']  -> produces "scale=1280:720"
  name: string;
  args?: Array<string | number | Record<string, string>>; // allow keyed args
}

export interface FilterChain {
  label?: string; // optional label for complex filter outputs e.g. [vout]
  inputs?: string[]; // labels or indexes
  outputs?: string[]; // labels
  filters: Filter[]; // ordered
}

export interface FFmpegOutputOptions {
  path: string; // output file or URL
  format?: string; // -f mp4/hls/mpegts etc
  // video
  videoCodec?: VideoCodecs; // -c:v
  crf?: number; // -crf (x264/x265)
  preset?: string; // -preset (x264/x265)
  profile?: string; // -profile:v
  tune?: string; // -tune
  bitrate?: string; // -b:v (e.g. '5000k')
  maxrate?: string; // -maxrate
  bufsize?: string; // -bufsize
  scale?: { width?: number; height?: number }; // convenience
  fps?: number; // -r
  pixFmt?: string; // -pix_fmt e.g. 'yuv420p'
  gopSize?: number; // -g
  audioCodec?: AudioCodec; // -c:a
  audioChannels?: number; // -ac
  audioRate?: number; // -ar
  audioBitrate?: string; // -b:a
  maps?: string[];
  movflags?: string[];
  segmentOptions?: {
    segmentTime?: number;
    playlistType?: "vod" | "event";
    segListSize?: number;
  };
  metadata?: Record<string, string>;
  outputOptions?: string[]; // additional arbitrary output options
  filterGraphs?: FilterChain[];
  overwrite?: boolean;
  twoPass?: TwoPassOptions;
}

interface TwoPassOptions {
  enabled?: boolean;
  targetSizeBytes?: number; // exact bytes target (preferred)
  targetSizeHuman?: string; // optional human string like "50M" (parsed if provided)
  audioBitrateKbps?: number; // audio allocation to reserve (kbps)
  passlogfile?: string; // log prefix (default 'ffmpeg2pass')
  maxrateKbps?: number; // optional maxrate for VBV handling
  bufsizeKbps?: number;
  preset?: string;
}

// Entire command structure
export interface FFmpegStructure {
  global?: GlobalOptions;
  inputs: FFmpegInputOptions[]; // at least one
  output: FFmpegOutputOptions; // at least one
  globalFilterGraphs?: FilterChain[];
  //progressUrl?: string;           // -progress url
}

export class FFmpegCommand {
  structure: FFmpegStructure;

  constructor(structure?: Partial<FFmpegStructure>) {
    this.structure = {
      global: structure?.global,
      inputs: structure?.inputs || [],
      output: structure?.output || [],
      globalFilterGraphs: structure?.globalFilterGraphs,
      //progressUrl: structure?.progressUrl,
    } as FFmpegStructure;
  }

  addGlobalOption(opt: Partial<GlobalOptions>) {
    this.structure.global = { ...(this.structure.global || {}), ...opt };
    return this;
  }

  addInput(input: FFmpegInputOptions) {
    this.structure.inputs.push(input);
    return this;
  }

  addOutput(output: FFmpegOutputOptions) {
    this.structure.output = output;
    return this;
  }

  serializeFilterChains(chains?: FilterChain[]) {
    if (!chains || chains.length === 0) return [];
    const parts = chains.map((chain) => {
      const inLabels = (chain.inputs || []).map((l) => `[${l}]`).join("");
      const outLabels = (chain.outputs || []).map((l) => `[${l}]`).join("");
      const filterStr = chain.filters
        .map((f) => {
          if (!f.args || f.args.length === 0) return f.name;
          const args = f.args
            .map((a) =>
              typeof a === "object"
                ? Object.entries(a)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(":")
                : String(a)
            )
            .join(",");
          return `${f.name}=${args}`;
        })
        .join(",");
      return `${inLabels}${filterStr}${outLabels}`;
    });
    return ["-filter_complex", parts.join(";")];
  }

  static parseHumanSize(h?: string): number | undefined {
    if (!h) return undefined;
    const s = String(h).trim().toUpperCase();
    const m = s.match(/^([\d.]+)\s*(B|K|KB|M|MB|G|GB)?$/);
    if (!m) return undefined;
    const val = parseFloat(m[1]);
    const unit = (m[2] || "B").toUpperCase();
    switch (unit) {
      case "B":
        return Math.round(val);
      case "K":
      case "KB":
        return Math.round(val * 1024);
      case "M":
      case "MB":
        return Math.round(val * 1024 * 1024);
      case "G":
      case "GB":
        return Math.round(val * 1024 * 1024 * 1024);
      default:
        return Math.round(val);
    }
  }

  static computeVideoBitrateKbps(
    targetBytes: number,
    durationSeconds: number,
    audioKbps = 128,
    overheadPercent = 5
  ): number {
    if (!targetBytes || targetBytes <= 0)
      throw new Error("invalid targetBytes");
    if (!durationSeconds || durationSeconds <= 0)
      throw new Error("invalid durationSeconds");

    const totalBits = targetBytes * 8;
    const totalBps = totalBits / durationSeconds;
    const audioBps = audioKbps * 1000 * 2;
    let videoBps = totalBps - audioBps;
    videoBps = videoBps * (1 - overheadPercent / 100);
    const videoKbps = Math.max(16, Math.floor(videoBps / 1000));
    return videoKbps;
  }

  buildArgs2(): string[] {
    const args = [];

    const out = this.structure.output;

    if (out.maps) {
      for (const m of out.maps) {
        args.push("-map", m);
      }
    }
    if (out.videoCodec) args.push("-c:v", out.videoCodec);
    if (typeof out.crf === "number") args.push("-crf", String(out.crf));
    if (out.preset) args.push("-preset", out.preset);
    if (out.bitrate) args.push("-b:v", out.bitrate);
    if (out.pixFmt) args.push("-pix_fmt", out.pixFmt);
    if (out.audioCodec) args.push("-c:a", out.audioCodec);
    if (out.audioBitrate) args.push("-b:a", out.audioBitrate);
    if (out.format) args.push("-f", out.format);
    if (out.movflags && out.movflags.length)
      args.push("-movflags", out.movflags.join("+"));
    if (out.fps) args.push("-r", `${out.fps}`);
    if (out.overwrite) args.push("-y");
    if (out.outputOptions) args.push(...out.outputOptions);

    return args;
  }

  buildArgsBeforeOutputs(): string[] {
    const args: string[] = [];
    const g = this.structure.global;
    if (g) {
      if (g.hideBanner) args.push("-hide_banner");
      if (g.overwrite) args.push("-y");
      if (g.loglevel) args.push("-loglevel", g.loglevel);
      if (typeof g.threads === "number")
        args.push("-threads", String(g.threads));
      if (g.hwaccel) args.push("-hwaccel", g.hwaccel);
      if (g.extra) args.push(...g.extra);
    }

    for (const input of this.structure.inputs) {
      if (input.format) args.push("-f", input.format);
      if (input.ss) args.push("-ss", input.ss);
      if (input.t) args.push("-t", input.t);
      if (input.inputOptions) args.push(...input.inputOptions);
      args.push("-i", input.path);
    }

    if (
      this.structure.globalFilterGraphs &&
      this.structure.globalFilterGraphs.length > 0
    ) {
      args.push(
        ...this.serializeFilterChains(this.structure.globalFilterGraphs)
      );
    }

    // if (this.structure.progressUrl) {
    //   args.push("-progress", this.structure.progressUrl);
    // }

    return args;
  }

  /* Returns a tuple with either both 1 pass and 2 pass command or a single command and a empty array */
  buildCommand(
    durationSeconds: number,
    overrideTargetSizeBytes?: number,
    overrideAudioKbps?: number
  ): [string[], string[]] {
    const out = this.structure.output;
    const two = out.twoPass;

    if (two?.enabled) {
      const targetBytes =
        overrideTargetSizeBytes ??
        two.targetSizeBytes ??
        FFmpegCommand.parseHumanSize(two.targetSizeHuman);

      if (!targetBytes)
        throw new Error(
          "target size not provided (targetSizeBytes or targetSizeHuman required)"
        );

      const audioKbps =
        overrideAudioKbps ??
        two.audioBitrateKbps ??
        (out.audioBitrate
          ? parseInt(String(out.audioBitrate).replace(/k/i, ""), 10)
          : 128);

      const videoKbps = FFmpegCommand.computeVideoBitrateKbps(
        targetBytes,
        durationSeconds,
        audioKbps
      );

      const passlog = two.passlogfile ?? "ffmpeg2pass";

      const baseBeforeOut = this.buildArgsBeforeOutputs();

      const pass1: string[] = [...baseBeforeOut, "-b:v", `${videoKbps}k`];

      if (two.maxrateKbps) {
        pass1.push("-maxrate", `${two.maxrateKbps}k`);
      }

      if (two.bufsizeKbps) {
        pass1.push("-bufsize", `${two.bufsizeKbps}k`);
      }

      pass1.push("-pass", "1", "-passlogfile", passlog);
      pass1.push("-an");
      pass1.push(...this.buildArgs2());
      pass1.push("-f", "null", nullDevice());

      const pass2: string[] = [...baseBeforeOut, "-b:v", `${videoKbps}k`];

      if (two.maxrateKbps) {
        pass2.push("-maxrate", `${two.maxrateKbps}k`);
      }

      if (two.bufsizeKbps) {
        pass2.push("-bufsize", `${two.bufsizeKbps}k`);
      }

      pass2.push("-pass", "2", "-passlogfile", passlog);
      pass2.push(...this.buildArgs2());

      pass2.push(out.path);

      return [pass1, pass2];
    } else {
      const command = [
        ...this.buildArgsBeforeOutputs(),
        ...this.buildArgs2(),
        out.path,
      ];
      return [command, []];
    }
  }
}

function nullDevice(): string {
  return "NUL";
}
