import { NextApiRequest, NextApiResponse } from "next";

function createAvatar(seed: string): string {
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

  function generateCircles(seed: string): string {
    let circles = "";

    // hash the seed
    seed = hash(seed).toString();

    for (let i = 0; i < seed.length; i++) {
      const hashValue = hash(seed[i] + seed);
      const x = (hashValue & 0x0f) * 10;
      const y = ((hashValue >> 4) & 0x0f) * 10;
      const radius = (((hashValue >> 8) & 0x0f) % 5) * 10 + 10;
      const color = colors[hashValue % colors.length];
      circles += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" />`;
    }
    return circles;
  }

  const svgWidth = 160;
  const svgHeight = 160;
  const viewBox = `0 0 ${svgWidth} ${svgHeight}`;

  const svg = `
            <svg width="${svgWidth}" height="${svgHeight}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
              ${generateCircles(seed)}
            </svg>`;

  return svg;
}

export async function GET(request: NextApiRequest) {
  // get seed parameter from url of type https://localhost:3000/svgs/:seed
  const url = request.url || "";
  const seed = url.split("/")[5];

  const svg = createAvatar(seed);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
}
