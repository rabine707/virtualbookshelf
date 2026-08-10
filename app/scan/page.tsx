import type { Metadata } from "next";
import ScanShelfPrototype from "./ScanShelfPrototype";

export const metadata: Metadata = {
  title: "Scan My Shelf | Shelf of Fame",
  description: "Prototype bookshelf-photo spine detection for Shelf of Fame.",
};

export default function ScanPage() {
  return <ScanShelfPrototype />;
}
