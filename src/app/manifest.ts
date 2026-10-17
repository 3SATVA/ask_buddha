import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ask AI Buddha",
    short_name: "Ask Buddha",
    description:
      "A quiet place to ask, with answers drawn from the Theravada scriptures.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#07090f",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
