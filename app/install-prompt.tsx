"use client";

import React, { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setVisible(false);
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded shadow-md">
      <button
        onClick={handleInstallClick}
        className="px-4 py-2 bg-teal-600 text-white rounded"
      >
        Install App
      </button>
      <button onClick={() => setVisible(false)} className="ml-2 text-gray-600">
        Cancel
      </button>
    </div>
  );
}
