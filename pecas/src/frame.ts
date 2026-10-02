function paintFrame(target: CanvasRenderingContext2D, width: number, height: number): void {
  target.save();
  target.scale(width / 1000, height / (2000 / 3));
  target.strokeStyle = '#000';
  target.lineCap = 'round';
  target.lineJoin = 'round';
  function edge(x1: number, y1: number, x2: number, y2: number, seed: number): void {
    const dx = x2 - x1,
      dy = y2 - y1,
      length = Math.hypot(dx, dy);
    const nx = -dy / length,
      ny = dx / length,
      steps = Math.ceil(length / 4);
    let previous: [number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        d = t * length;
      const wobble =
        1.05 * Math.sin(d * 0.025 + seed) +
        0.4 * Math.sin(d * 0.071 + seed * 2) +
        0.12 * Math.sin(d * 0.14 + seed);
      const x = x1 + dx * t + nx * wobble,
        y = y1 + dy * t + ny * wobble;
      if (previous) {
        target.lineWidth = 1.35 + 0.22 * Math.sin(d * 0.019 + seed) + 0.08 * Math.sin(d * 0.083);
        target.beginPath();
        target.moveTo(previous[0], previous[1]);
        target.lineTo(x, y);
        target.stroke();
      }
      previous = [x, y];
    }
  }
  edge(5, 7, 995, 7, 1);
  edge(993, 4, 993, 661, 3);
  edge(997, 659, 4, 659, 5);
  edge(7, 663, 7, 3, 7);
  target.restore();
}

const frames = new Map<string, HTMLCanvasElement>();
export function drawFrame(target: CanvasRenderingContext2D, width: number, height: number): void {
  const transform = target.getTransform();
  const pixelWidth = Math.max(1, Math.round(width * Math.abs(transform.a)));
  const pixelHeight = Math.max(1, Math.round(height * Math.abs(transform.d)));
  const key = `${pixelWidth}:${pixelHeight}`;
  let canvas = frames.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext('2d')!;
    paintFrame(context, pixelWidth, pixelHeight);
    if (frames.size >= 4) frames.delete(frames.keys().next().value!);
    frames.set(key, canvas);
  }
  target.drawImage(canvas, 0, 0, width, height);
}
