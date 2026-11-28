/* Original Stillwater bowl synthesis; no source recording or sample input. */
(() => {
  const profiles = {
    root: [130.81, [1, 2.70, 4.91, 7.17], 2.5],
    sacral: [174.61, [1, 2.62, 4.81, 7.43], 2.3],
    heart: [261.63, [1, 2.54, 4.74, 7.03], 2.7],
    "third-eye": [392, [1, 2.49, 4.68, 7.59], 3]
  };
  const tracks = [
    { id: "root", title: "Root · singing bowl" },
    { id: "sacral", title: "Sacral · singing bowl" },
    { id: "heart", title: "Heart · singing bowl" },
    { id: "third-eye", title: "Third eye · singing bowl" }
  ];
  const files = new Map();
  function urlFor(id) {
    if (!Object.hasOwn(profiles, id)) return "";
    if (files.has(id)) return files.get(id);
    const [base, ratios, decay] = profiles[id];
    const rate = 16000;
    const sec = 48;
    const n = rate * sec;
    const samples = new Float32Array(n);
    const gains = [.58, .22, .11, .04];
    for (const [time, pitch, amp] of [[0, 1, .89], [12, 1.5, .68], [24, 1, .83], [36, 1.25, .63]]) {
      for (let j = 0; j < ratios.length; j++) {
        const omega = 2 * Math.PI * base * pitch * ratios[j] / rate;
        const ring = decay / (1 + .66 * j);
        const detune = 1.002 + .0006 * j;
        for (let i = 0; i < 14 * rate; i++) {
          const t = i / rate;
          const env = (1 - Math.exp(-t * (30 + 17 * j))) * Math.exp(-t / ring)
            * (t > 12 ? (1 + Math.cos(Math.PI * (t - 12) / 2)) / 2 : 1);
          samples[(i + time * rate) % n] += amp * gains[j] * env
            * (Math.sin(omega * i) + .15 * Math.sin(omega * detune * i));
        }
      }
    }
    let peak = .01;
    for (const x of samples) peak = Math.max(peak, Math.abs(x));
    const buffer = new ArrayBuffer(44 + 2 * n);
    const wav = new DataView(buffer);
    const tag = (at, word) => [...word].forEach((c, i) => wav.setUint8(at + i, c.charCodeAt(0)));
    tag(0, "RIFF"); wav.setUint32(4, buffer.byteLength - 8, true);
    tag(8, "WAVE"); tag(12, "fmt "); wav.setUint32(16, 16, true);
    wav.setUint16(20, 1, true); wav.setUint16(22, 1, true); wav.setUint32(24, rate, true);
    wav.setUint32(28, 2 * rate, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true);
    tag(36, "data"); wav.setUint32(40, 2 * n, true);
    for (let i = 0; i < n; i++) {
      const edge = Math.min(1, i / (.25 * rate), (n - 1 - i) / (.75 * rate));
      const fade = (1 - Math.cos(Math.PI * edge)) / 2;
      wav.setInt16(44 + 2 * i, Math.round(.42 * 32767 * samples[i] * fade / peak), true);
    }
    if (files.size) {
      for (const url of files.values()) URL.revokeObjectURL(url);
      files.clear();
    }
    const url = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    files.set(id, url);
    return url;
  }
  window.StillwaterChakraAudio = { tracks, urlFor };
})();
