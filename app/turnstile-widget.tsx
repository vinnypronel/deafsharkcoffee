"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render(container: HTMLElement, options: {
    sitekey: string;
    action: string;
    theme: "light" | "dark";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": (code?: string) => void;
  }): string;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const scriptId = "cloudflare-turnstile-script";
const scriptSource = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileWidgetProps = {
  action: "contact" | "newsletter" | "employment" | "order";
  onToken: (token: string) => void;
  resetKey: number;
  theme?: "light" | "dark";
};

export default function TurnstileWidget({ action, onToken, resetKey, theme = "light" }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const onTokenRef = useRef(onToken);
  const [siteKey, setSiteKey] = useState("");
  const [ready, setReady] = useState(false);
  const [configurationError, setConfigurationError] = useState(false);
  /* Turnstile reports why it failed. Surfacing the code turns "Troubleshoot"
     into something diagnosable: 110200 is an unlisted hostname, 110100 and
     110110 are a bad or mismatched sitekey. */
  const [errorCode, setErrorCode] = useState("");

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let active = true;
    fetch("/api/turnstile-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Turnstile configuration unavailable");
        return response.json() as Promise<{ configured?: boolean; siteKey?: string }>;
      })
      .then((config) => {
        if (!active) return;
        if (!config.configured || !config.siteKey) setConfigurationError(true);
        else setSiteKey(config.siteKey);
      })
      .catch(() => active && setConfigurationError(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (window.turnstile) {
      queueMicrotask(() => setReady(true));
      return;
    }
    const script = existing ?? document.createElement("script");
    const onLoad = () => setReady(true);
    const onError = () => setConfigurationError(true);
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (!existing) {
      script.id = scriptId;
      script.src = scriptSource;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, [siteKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !siteKey || !container || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(container, {
      sitekey: siteKey,
      action,
      theme,
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(""),
      "error-callback": (code?: string) => {
        setErrorCode(code ?? "unknown");
        console.error(`Turnstile failed for action "${action}"`, { code, hostname: window.location.hostname });
        onTokenRef.current("");
      },
    });
    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
      onTokenRef.current("");
    };
  }, [action, ready, siteKey, theme]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenRef.current("");
  }, [resetKey]);

  if (configurationError) {
    return <p className="turnstile-unavailable" role="alert">Security verification is unavailable. Please try again later.</p>;
  }

  return (
    <div className="turnstile-control">
      <div ref={containerRef} aria-label="Security verification" />
      {!ready && <p className="turnstile-status" role="status">Loading security verification...</p>}
      {errorCode && (
        <p className="turnstile-status" role="alert">
          Security check could not load (code {errorCode}). Please reload the page.
        </p>
      )}
    </div>
  );
}
