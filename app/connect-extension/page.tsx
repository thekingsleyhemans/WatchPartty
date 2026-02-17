"use client";

import { useEffect, useState } from "react";

export default function ConnectExtensionPage() {
  const [status, setStatus] = useState<string>("Not connected");
  const [extensionId, setExtensionId] = useState<string>("");

  useEffect(() => {
    setExtensionId(localStorage.getItem("watchparrty_extension_id") || "");
  }, []);

  const connect = async () => {
    const chromeApi = (window as typeof window & { chrome?: any }).chrome;
    setStatus("Connecting...");
    const res = await fetch("/api/extension-token");
    const payload = await res.json();

    if (!res.ok) {
      setStatus(payload.error || "Unable to fetch token");
      return;
    }

    localStorage.setItem("watchparrty_extension_connected", "true");
    localStorage.setItem("watchparrty_supabase_url", payload.supabaseUrl);
    localStorage.setItem("watchparrty_supabase_anon_key", payload.anonKey);

    if (!extensionId || !chromeApi?.runtime) {
      await navigator.clipboard.writeText(payload.accessToken);
      setStatus("Token copied. Paste it in extension if auto-connect is unavailable.");
      return;
    }

    localStorage.setItem("watchparrty_extension_id", extensionId);

    chromeApi.runtime.sendMessage(extensionId, {
      type: "WATCHPARRTY_SET_AUTH",
      payload
    }, (response) => {
      if (chromeApi.runtime.lastError) {
        setStatus("Message to extension failed. Token copied as fallback.");
      } else {
        setStatus(response?.ok ? "Connected to extension" : "Extension rejected token");
      }
    });
  };

  return (
    <section className="mx-auto grid max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Connect Extension</h1>
      <p className="text-sm text-slate-600">
        Netflix playback cannot be embedded in the web app. Install the extension and connect your current account token.
      </p>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Extension ID (optional but recommended)</span>
        <input
          placeholder="abcdefghijklmnopabcdefghijklmnop"
          value={extensionId}
          onChange={(e) => setExtensionId(e.target.value)}
        />
      </label>
      <button onClick={connect} className="w-fit bg-slate-900 text-white">
        Connect Extension
      </button>
      <p className="text-sm">Status: {status}</p>
    </section>
  );
}
