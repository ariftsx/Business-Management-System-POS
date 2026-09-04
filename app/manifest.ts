import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KTM Digital Printing Business System",
    short_name: "KTM Digital Printing",
    description: "Sistem manajemen bisnis dan POS KTM Digital Printing",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#2563EB",
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}