import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NativeLinkBridge } from "@/components/native-link-bridge";
import { SHARE_IMAGE_PATH, siteUrl } from "@/lib/site";
import "./globals.css";
import "./title-size.css";

const outfit = localFont({
  src: "../fonts/outfit.woff2",
  weight: "100 900",
  variable: "--font-outfit",
});

const cinzel = localFont({
  src: "../fonts/cinzel.woff2",
  weight: "400 900",
  variable: "--font-cinzel-face",
});

const display = localFont({
  src: [
    { path: "../fonts/cormorant.woff2", weight: "400 700", style: "normal" },
    { path: "../fonts/cormorant-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-cormorant",
});

const description =
  "Ask a question and receive a warm answer in the voice of the Buddha, grounded in the Pali Canon.";
const shareDescription =
  "A quiet place to ask, with answers drawn from the Theravada scriptures.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#07090f",
};

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "ASK BUDDHA",
  applicationName: "Ask AI Buddha",
  description,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Ask Buddha",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "ASK BUDDHA",
    description: shareDescription,
    siteName: "Ask AI Buddha",
    type: "website",
    url: siteUrl(),
    images: [
      {
        url: SHARE_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "The Buddha seated, light shining through the clouds. ASK BUDDHA.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASK BUDDHA",
    description: shareDescription,
    images: [SHARE_IMAGE_PATH],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${display.variable} ${cinzel.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preload"
          as="image"
          href="/art/buddha-1280.avif"
          type="image/avif"
          imageSrcSet="/art/buddha-640.avif 640w, /art/buddha-960.avif 960w, /art/buddha-1280.avif 1280w, /art/buddha-1600.avif 1600w, /art/buddha-1952.avif 1952w"
          imageSizes="100vw"
        />
      </head>
      <body className="bg-black text-[#f6efe2]">
        <NativeLinkBridge />
        {children}
      </body>
    </html>
  );
}
