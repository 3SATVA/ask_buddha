import type { CapacitorConfig } from "@capacitor/cli";
import { PRODUCTION_SITE_URL } from "./src/lib/site";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim() || PRODUCTION_SITE_URL;

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "ask-buddha.vercel.app";
  }
}

const config: CapacitorConfig = {
  appId: "com.starseedsquad.askbuddha",
  appName: "Ask Buddha",
  webDir: "native/www",
  server: {
    url: serverUrl,
    cleartext: false,
    allowNavigation: [hostOf(serverUrl)],
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#000000",
  },
  android: {
    backgroundColor: "#000000",
  },
  plugins: {
    NativePurchases: {
      autoFinishTransactions: false,
    },
  },
};

export default config;
