import { useState } from "react";
import { formatTrackingCode } from "../lib/codeGenerator";

export default function CodeTicket({ code, subLabel }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="ticket">
      <div className="ticket-label">Owner tracking code</div>
      <div className="ticket-code">{formatTrackingCode(code)}</div>
      {subLabel && <div className="ticket-sub">{subLabel}</div>}
      <div style={{ marginTop: 18 }}>
        <button className="btn btn-secondary" onClick={handleCopy}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
    </div>
  );
}
