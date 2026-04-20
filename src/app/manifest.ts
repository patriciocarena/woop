import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Woop — Recovery, Strain & Sleep",
    short_name: "Woop",
    description: "Personal Whoop-style recovery, strain and sleep tracker.",
    start_url: "/today",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-mask.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
