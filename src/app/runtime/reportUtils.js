export function downloadTextFile(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function toFiniteNumberOrZero(raw) {
  try {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}


export function summarizeSeries(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return { avg: 0, min: 0, max: 0, frames: 0 };
  }
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const raw of values) {
    const v = toFiniteNumberOrZero(raw);
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return {
    avg: sum / values.length,
    min,
    max,
    frames: values.length,
  };
}
