import type { Metadata } from "next";
import { headers } from "next/headers";
import "@xyflow/react/dist/style.css";
import "./globals.css";

const fallbackOrigin = new URL(
  "https://ripplelab-progress.nayaksiddartha397.chatgpt.site",
);

function requestOrigin(requestHeaders: Headers) {
  const host = (
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  )
    ?.split(",")[0]
    ?.trim();
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : host?.startsWith("localhost")
        ? "http"
        : "https";

  if (!host) {
    return fallbackOrigin;
  }

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return fallbackOrigin;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = requestOrigin(await headers());
  const socialImageUrl = new URL(
    "/og-day9.png",
    origin,
  ).toString();
  const title = "RippleLab | Personal economic simulations";
  const description =
    "Explore how supported economic changes could affect your household under transparent assumptions.";

  return {
    metadataBase: origin,
    title,
    description,
    openGraph: {
      type: "website",
      url: origin,
      siteName: "RippleLab",
      title,
      description,
      images: [
        {
          url: socialImageUrl,
          width: 1536,
          height: 1024,
          alt: "RippleLab Day 9 personal inflation engine showing headline CPI flowing through a household basket to expenses and purchasing power",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImageUrl],
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
