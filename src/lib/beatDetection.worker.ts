import { detectBeats } from './beatDetection';
self.onmessage = (event: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => {
  self.postMessage(detectBeats(event.data.samples, event.data.sampleRate));
};
