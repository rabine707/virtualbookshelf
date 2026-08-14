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
  {
    id: "vecteezy-leaf-canopy",
    name: "Hanging Leaf Canopy PNG",
    source: "Vecteezy",
    sourceUrl: "https://www.vecteezy.com/free-png/leaf",
    license: "Vecteezy free asset — attribution required",
    attribution: "Leaf PNGs by Vecteezy",
    usage: "Botanical theme upper window and header canopy foliage",
  },
  {
    id: "vecteezy-antique-globe",
    name: "Antique Style Vintage Globe PNG",
    source: "Vecteezy",
    sourceUrl: "https://www.vecteezy.com/free-png/globe",
    license: "Vecteezy free asset — attribution required",
    attribution: "Globe PNGs by Vecteezy",
    usage: "Botanical theme lower-shelf focal decor",
  },
  {
    id: "vecteezy-tree-branches",
    name: "Tree Branches PNG",
    source: "Vecteezy",
    sourceUrl: "https://www.vecteezy.com/free-png/tree",
    license: "Vecteezy free asset — attribution required",
    attribution: "Tree PNGs by Vecteezy",
    usage: "Botanical theme exterior window foliage layer",
  },
];
