export function resampleFloat32(data: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) return data;
  const ratio = toRate / fromRate;
  const newLength = Math.round(data.length * ratio);
  const out = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const t = i / ratio;
    const i0 = Math.floor(t);
    const i1 = Math.min(i0 + 1, data.length - 1);
    const frac = t - i0;
    out[i] = data[i0] * (1 - frac) + data[i1] * frac;
  }
  return out;
}

export function floatToInt16PCM(data: Float32Array) {
  const out = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let s = data[i];
    s = Math.max(-1, Math.min(1, s));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
