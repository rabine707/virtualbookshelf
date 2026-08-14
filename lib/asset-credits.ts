export type AssetCredit = {
  id: string;
  name: string;
  creator?: string;
  source: string;
  sourceUrl: string;
  license: string;
  attribution?: string;
  usage?: string;
};

export const assetCredits: AssetCredit[] = [
  {
    id: "vecteezy-hanging-vines",
    name: "Hanging Vines PNG",
    source: "Vecteezy",
    sourceUrl: "https://www.vecteezy.com/free-png/hanging-vines",
    license: "Vecteezy free asset — attribution required",
    attribution: "Hanging Vines PNGs by Vecteezy",
    usage: "Botanical theme foreground foliage",
  },
];
