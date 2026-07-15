function encodeWav(chunks, sampleRate) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, 36 + length * 2, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const chunk of chunks) for (const sample of chunk) {
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true); offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export class WavAudioRecorder {
  constructor(stream) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass({ sampleRate: 16000 });
    this.source = this.context.createMediaStreamSource(stream);
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    this.chunks = []; this.state = "inactive"; this.mimeType = "audio/wav";
    this.processor.onaudioprocess = (event) => {
      if (this.state === "recording") this.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    this.source.connect(this.processor); this.processor.connect(this.context.destination);
  }
  start() { this.chunks = []; this.context.resume().catch(() => {}); this.state = "recording"; }
  stop() {
    if (this.state === "inactive") return;
    this.state = "inactive";
    const blob = encodeWav(this.chunks, this.context.sampleRate);
    this.ondataavailable?.({ data: blob });
    this.source.disconnect(); this.processor.disconnect(); this.context.close();
    this.onstop?.();
  }
}
