import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TAP Client Hub",
    short_name: "TAP Hub",
    description: "TAP Associates client operations hub",
    start_url: "/",
    display: "standalone",
    background_color: "#101512",
    theme_color: "#101512",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
