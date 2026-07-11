/**
 * Decode an audio data-URL into normalized waveform peaks (for drawing) plus its
 * duration. Results are cached per source so each clip decodes once. Client-only.
 */
type Wave = { peaks: number[]; duration: number };

const cache = new Map<string, Wave>();
const inflight = new Map<string, Promise<Wave>>();

export async function getWaveform(src: string, buckets = 240): Promise<Wave> {
  const cached = cache.get(src);
  if (cached) return cached;
  const running = inflight.get(src);
  if (running) return running;

  const p = (async (): Promise<Wave> => {
    let ctx: AudioContext | undefined;
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AudioCtx();
      const buf = await (await fetch(src)).arrayBuffer();
      const audio = await ctx.decodeAudioData(buf);
      const data = audio.getChannelData(0);
      const block = Math.max(1, Math.floor(data.length / buckets));
      const peaks: number[] = [];
      let peakMax = 0.0001;
      for (let i = 0; i < buckets; i++) {
        let max = 0;
        for (let j = 0; j < block; j++) {
          const v = Math.abs(data[i * block + j] || 0);
          if (v > max) max = v;
        }
        peaks.push(max);
        if (max > peakMax) peakMax = max;
      }
      // Normalize to 0..1.
      const normalized = peaks.map((v) => v / peakMax);
      const result: Wave = { peaks: normalized, duration: audio.duration };
      cache.set(src, result);
      return result;
    } catch {
      const fallback: Wave = { peaks: [], duration: 0 };
      cache.set(src, fallback);
      return fallback;
    } finally {
      // Always release the AudioContext (even on decode failure) so browsers
      // don't hit the ~6-context limit after several undecodable files.
      try {
        await ctx?.close();
      } catch {
        /* already closed */
      }
      inflight.delete(src);
    }
  })();

  inflight.set(src, p);
  return p;
}

export function getCachedWaveform(src: string): Wave | undefined {
  return cache.get(src);
}
