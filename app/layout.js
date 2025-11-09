import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Import Spectrum Web Components styles globally
import '@spectrum-web-components/styles/core-global.css';
import '@spectrum-web-components/styles/theme-light.css';
import '@spectrum-web-components/styles/scale-large.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SoundBrush",
  description: "A drawing application for the visually impaired",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
