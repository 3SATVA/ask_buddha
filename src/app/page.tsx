import { AskPanel } from "@/components/ask-panel";
import { AskTitle } from "@/components/ask-title";
import { BuddhaScene } from "@/components/buddha-scene";
import { ViewportShell } from "@/components/viewport-shell";
import { dailyLimit, supportUrl, unlimitedDailyCap } from "@/lib/config";

export default function Home() {
  return (
    <ViewportShell>
      <BuddhaScene contained />
      <AskTitle />
      <div className="chat-dock">
        <AskPanel
          supportUrl={supportUrl()}
          initialLimit={dailyLimit()}
          unlimitedCap={unlimitedDailyCap()}
        />
      </div>
    </ViewportShell>
  );
}
