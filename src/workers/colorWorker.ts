// Reinhard Color Transfer Web Worker
// Optimized with LUT for power functions

const SRGB_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255.0;
  SRGB_LUT[i] = v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
}

const D65_X = 95.047;
const D65_Y = 100.000;
const D65_Z = 108.883;

// sRGB to XYZ
function rgbToXyz(r: number, g: number, b: number) {
  let r0 = SRGB_LUT[r] * 100;
  let g0 = SRGB_LUT[g] * 100;
  let b0 = SRGB_LUT[b] * 100;

  const x = r0 * 0.4124 + g0 * 0.3576 + b0 * 0.1805;
  const y = r0 * 0.2126 + g0 * 0.7152 + b0 * 0.0722;
  const z = r0 * 0.0193 + g0 * 0.1192 + b0 * 0.9505;

  return [x, y, z];
}

// XYZ to LAB
function xyzToLab(x: number, y: number, z: number) {
  let x0 = x / D65_X;
  let y0 = y / D65_Y;
  let z0 = z / D65_Z;

  x0 = x0 > 0.008856 ? Math.pow(x0, 1 / 3) : (7.787 * x0) + (16 / 116);
  y0 = y0 > 0.008856 ? Math.pow(y0, 1 / 3) : (7.787 * y0) + (16 / 116);
  z0 = z0 > 0.008856 ? Math.pow(z0, 1 / 3) : (7.787 * z0) + (16 / 116);

  const l = (116 * y0) - 16;
  const a = 500 * (x0 - y0);
  const b = 200 * (y0 - z0);

  return [l, a, b];
}

// LAB to XYZ
function labToXyz(l: number, a: number, b: number) {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const y3 = y * y * y;
  const x3 = x * x * x;
  const z3 = z * z * z;

  y = y > 0.20689 ? y3 : (y - 16 / 116) / 7.787;
  x = x > 0.20689 ? x3 : (x - 16 / 116) / 7.787;
  z = z > 0.20689 ? z3 : (z - 16 / 116) / 7.787;

  return [x * D65_X, y * D65_Y, z * D65_Z];
}

// XYZ to sRGB
function xyzToRgb(x: number, y: number, z: number) {
  x /= 100;
  y /= 100;
  z /= 100;

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.2040 + z * 1.0570;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  return [
    Math.max(0, Math.min(255, Math.round(r * 255))),
    Math.max(0, Math.min(255, Math.round(g * 255))),
    Math.max(0, Math.min(255, Math.round(b * 255)))
  ];
}

function getStats(data: Uint8ClampedArray) {
  let meanL = 0, meanA = 0, meanB = 0;
  let devL = 0, devA = 0, devB = 0;
  const N = data.length / 4;

  const labData = new Float32Array(N * 3);

  for (let i = 0; i < N; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    
    const [x, y, z] = rgbToXyz(r, g, b);
    const [l, a, labB] = xyzToLab(x, y, z);
    
    labData[i * 3] = l;
    labData[i * 3 + 1] = a;
    labData[i * 3 + 2] = labB;

    meanL += l;
    meanA += a;
    meanB += labB;
  }

  meanL /= N;
  meanA /= N;
  meanB /= N;

  for (let i = 0; i < N; i++) {
    devL += Math.pow(labData[i * 3] - meanL, 2);
    devA += Math.pow(labData[i * 3 + 1] - meanA, 2);
    devB += Math.pow(labData[i * 3 + 2] - meanB, 2);
  }

  devL = Math.sqrt(devL / N);
  devA = Math.sqrt(devA / N);
  devB = Math.sqrt(devB / N);

  return { meanL, meanA, meanB, devL, devA, devB, labData };
}

self.onmessage = (e) => {
  const { original, reference } = e.data;
  
  if (!original || !reference) {
    self.postMessage({ error: 'Missing data' });
    return;
  }

  try {
    const statsSrc = getStats(original.data);
    const statsRef = getStats(reference.data);

    const N = original.data.length / 4;
    const outData = new Uint8ClampedArray(original.data.length);

    const ratioL = statsSrc.devL < 0.001 ? 1 : statsRef.devL / statsSrc.devL;
    const ratioA = statsSrc.devA < 0.001 ? 1 : statsRef.devA / statsSrc.devA;
    const ratioB = statsSrc.devB < 0.001 ? 1 : statsRef.devB / statsSrc.devB;

    for (let i = 0; i < N; i++) {
      const lSrc = statsSrc.labData[i * 3];
      const aSrc = statsSrc.labData[i * 3 + 1];
      const bSrc = statsSrc.labData[i * 3 + 2];

      const lOut = (lSrc - statsSrc.meanL) * ratioL + statsRef.meanL;
      const aOut = (aSrc - statsSrc.meanA) * ratioA + statsRef.meanA;
      const bOut = (bSrc - statsSrc.meanB) * ratioB + statsRef.meanB;

      const [x, y, z] = labToXyz(lOut, aOut, bOut);
      const [r, g, b] = xyzToRgb(x, y, z);

      outData[i * 4] = r;
      outData[i * 4 + 1] = g;
      outData[i * 4 + 2] = b;
      outData[i * 4 + 3] = original.data[i * 4 + 3]; // Preserve alpha
    }

    const resultImageData = new ImageData(outData, original.width, original.height);
    self.postMessage({ result: resultImageData });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};

