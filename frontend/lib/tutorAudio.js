let tutorAudio;
// Reuse the element primed by the learner's opening tap. Async replies can then
// play on browsers that require a user gesture to unlock the audio element.
export function getTutorAudio() {
  tutorAudio ||= new Audio();
  return tutorAudio;
}
export function primeTutorAudio() {
  const audio = getTutorAudio();
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  const word = (offset, text) => [...text].forEach((char, index) => { bytes[offset + index] = char.charCodeAt(0); });
  word(0, 'RIFF'); view.setUint32(4, 38, true); word(8, 'WAVE'); word(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  word(36, 'data'); view.setUint32(40, 2, true);
  const source = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  audio.src = source;
  void audio.play().catch(() => undefined).finally(() => {
    if (audio.src === source) audio.pause();
    URL.revokeObjectURL(source);
  });
}
