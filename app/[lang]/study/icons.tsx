export function createAvatar(seed: string): string {
  const colors = [
    "#F44336",
    "#E91E63",
    "#9C27B0",
    "#673AB7",
    "#3F51B5",
    "#2196F3",
    "#03A9F4",
    "#00BCD4",
    "#009688",
    "#4CAF50",
    "#8BC34A",
    "#CDDC39",
    "#FFEB3B",
    "#FFC107",
    "#FF9800",
    "#FF5722",
  ];

  function hash(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return hash;
  }

  function generateRectangles(seed: string): string {
    let rects = "";
    for (let i = 0; i < seed.length; i++) {
      const hashValue = hash(seed[i] + seed);
      const x = (hashValue & 0x0f) * 10;
      const y = ((hashValue >> 4) & 0x0f) * 10;
      const width = (((hashValue >> 8) & 0x0f) % 5) * 10 + 10;
      const height = (((hashValue >> 12) & 0x0f) % 5) * 10 + 10;
      const color = colors[hashValue % colors.length];
      rects += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" />`;
    }
    return rects;
  }

  const svgWidth = 160;
  const svgHeight = 160;
  const viewBox = `0 0 ${svgWidth} ${svgHeight}`;

  const svg = `
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        ${generateRectangles(seed)}
      </svg>`;

  return svg;
}
