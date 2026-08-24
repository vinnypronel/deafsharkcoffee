"use client";

const CODE_39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw",
  C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
  G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
  O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn",
  S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw",
  W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn",
  "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn",
};

type Bar = { x: number; width: number };

function encode(value: string) {
  const safe = value.toUpperCase().split("").filter((character) => CODE_39[character]).join("");
  const encoded = `*${safe}*`;
  const bars: Bar[] = [];
  let x = 10;

  encoded.split("").forEach((character) => {
    const pattern = CODE_39[character];
    pattern.split("").forEach((widthCode, index) => {
      const width = widthCode === "w" ? 5 : 2;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
    x += 2;
  });

  return { bars, width: x + 8, text: safe };
}

export function OfferBarcode({ value, compact = false }: { value: string; compact?: boolean }) {
  const barcode = encode(value);
  return (
    <div className={`offer-barcode${compact ? " offer-barcode-compact" : ""}`} aria-label={`Coupon barcode ${barcode.text}`}>
      <svg viewBox={`0 0 ${barcode.width} 62`} role="img" aria-hidden="true" preserveAspectRatio="none">
        <rect width={barcode.width} height="62" fill="#fff" />
        {barcode.bars.map((bar, index) => <rect key={`${bar.x}-${index}`} x={bar.x} y="5" width={bar.width} height="52" fill="#160d09" />)}
      </svg>
      <code>{barcode.text}</code>
    </div>
  );
}
