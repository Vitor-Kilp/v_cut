import { z } from 'zod';

const encoders = [
  'hevc_nvenc',
  'h264_nvenc',
  'libx264',
  'libx265',
  'h264_amf',
  'hevc_amf',
] as const;

const nvencPresets = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;
const libxPresets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'] as const;
const amfPresets = ['speed', 'balanced', 'quality'] as const;
const encodingModes = ['crf', 'cbr', 'two-pass'] as const;

const resolutions = ["2160", "1080", "720", "480"] as const;
const fps = ["source", "24", "30", "60", "120", "240"]

const baseSchema = z.object({
//   input: z.string().min(1, 'Input file is required'),
//   output: z.string().min(1, 'Output file is required'),
  mode: z.enum(encodingModes),
  resolution: z.enum(resolutions),
  fps: z.enum(fps)
});

// CRF mode schema
const crfModeSchema = baseSchema.extend({
  mode: z.literal('crf'),
  crf: z.number().min(0).max(51),
});

// CBR mode schema
const cbrModeSchema = baseSchema.extend({
  mode: z.literal('cbr'),
  bitrate: z.number().min(1).max(100),
});

// Two-pass mode schema
const twoPassModeSchema = baseSchema.extend({
  mode: z.literal('two-pass'),
  size: z.number().min(1).max(10000)
});

// Discriminated union schema combining modes and encoders
const ffmpegSchema = z.discriminatedUnion('mode', [
  // CRF mode
  z.discriminatedUnion('encoder', [
    // crfModeSchema.extend({
    //   encoder: z.literal('hevc_nvenc'),
    //   preset: z.enum(nvencPresets),
    // }),
    // crfModeSchema.extend({
    //   encoder: z.literal('h264_nvenc'),
    //   preset: z.enum(nvencPresets),
    // }),
    crfModeSchema.extend({
      encoder: z.literal('libx264'),
      preset: z.enum(libxPresets),
    }),
    crfModeSchema.extend({
      encoder: z.literal('libx265'),
      preset: z.enum(libxPresets),
    }),
    // crfModeSchema.extend({
    //   encoder: z.literal('h264_amf'),
    //   preset: z.enum(amfPresets),
    // }),
    // crfModeSchema.extend({
    //   encoder: z.literal('hevc_amf'),
    //   preset: z.enum(amfPresets),
    // }),
  ], {error: "CRF dosen't suport GPU encoders"}),
  // CBR mode
  z.discriminatedUnion('encoder', [
    cbrModeSchema.extend({
      encoder: z.literal('hevc_nvenc'),
      preset: z.enum(nvencPresets),
    }),
    cbrModeSchema.extend({
      encoder: z.literal('h264_nvenc'),
      preset: z.enum(nvencPresets),
    }),
    cbrModeSchema.extend({
      encoder: z.literal('libx264'),
      preset: z.enum(libxPresets),
    }),
    cbrModeSchema.extend({
      encoder: z.literal('libx265'),
      preset: z.enum(libxPresets),
    }),
    cbrModeSchema.extend({
      encoder: z.literal('h264_amf'),
      preset: z.enum(amfPresets),
    }),
    cbrModeSchema.extend({
      encoder: z.literal('hevc_amf'),
      preset: z.enum(amfPresets),
    }),
  ]),

  z.discriminatedUnion('encoder', [
    twoPassModeSchema.extend({
      encoder: z.literal('hevc_nvenc'),
      preset: z.enum(nvencPresets),
    }),
    twoPassModeSchema.extend({
      encoder: z.literal('h264_nvenc'),
      preset: z.enum(nvencPresets),
    }),
    twoPassModeSchema.extend({
      encoder: z.literal('libx264'),
      preset: z.enum(libxPresets),
    }),
    twoPassModeSchema.extend({
      encoder: z.literal('libx265'),
      preset: z.enum(libxPresets),
    }),
    twoPassModeSchema.extend({
      encoder: z.literal('h264_amf'),
      preset: z.enum(amfPresets),
    }),
    twoPassModeSchema.extend({
      encoder: z.literal('hevc_amf'),
      preset: z.enum(amfPresets),
    }),
  ]),
]);

function getPresetsForEncoder(encoder: typeof encoders[number]) {
  if (encoder === 'hevc_nvenc' || encoder === 'h264_nvenc') {
    return nvencPresets;
  } else if (encoder === 'libx264' || encoder === 'libx265') {
    return libxPresets;
  } else {
    return amfPresets;
  }
}

type FFmpegCommand = z.infer<typeof ffmpegSchema>;

export { ffmpegSchema, encoders, encodingModes, resolutions, fps, getPresetsForEncoder, type FFmpegCommand};