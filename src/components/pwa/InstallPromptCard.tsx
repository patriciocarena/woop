"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "woop:install-dismissed:v1";

export function InstallPromptCard() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!window.localStorage.getItem(DISMISSED_KEY);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!evt || dismissed) return null;

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Instalá Woop</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-fg-muted">
          Instalala en tu home screen para que se comporte como una app nativa — más rápida y accesible offline.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={install} className="flex-1">Instalar</Button>
          <Button size="sm" variant="outline" onClick={dismiss}>Después</Button>
        </div>
      </CardContent>
    </Card>
  );
}
