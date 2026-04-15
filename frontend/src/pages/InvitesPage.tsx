import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';

export function InvitesPage() {
  const [ref, setRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.me().then(me => setRef(me.username ?? me.email ?? String(me.user_id))).catch(() => {});
  }, []);

  const betaUrl = `${window.location.origin}/beta${ref ? `?ref=${ref}` : ''}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(betaUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      <div className="nerv-divider" style={{ marginBottom: 24 }}>
        <span>INVITE A FRIEND</span>
      </div>

      <div style={{
        fontSize: 17,
        fontFamily: 'var(--font-body)',
        color: 'var(--text-primary)',
        textAlign: 'center',
        lineHeight: 1.6,
        marginBottom: 32,
      }}>
        Share this link to invite friends to the Lightweight beta.
      </div>

      {/* QR code */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <QRCodeSVG
          value={betaUrl}
          size={200}
          bgColor="transparent"
          fgColor="#e8a832"
          level="M"
        />
      </div>

      {/* URL display */}
      <div className="card" style={{
        textAlign: 'center',
        marginBottom: 16,
        wordBreak: 'break-all',
      }}>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: 12,
          color: 'var(--accent-cyan)',
          textShadow: 'var(--glow-cyan-text)',
          letterSpacing: '0.5px',
        }}>
          {betaUrl}
        </span>
      </div>

      {/* Copy button */}
      <button
        className="btn btn-primary btn-full"
        style={{
          minHeight: 56,
          fontSize: 16,
          letterSpacing: '2px',
          ['--btn-cut' as string]: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
        onClick={copyUrl}
      >
        {copied ? (
          <>
            <span style={{ color: 'var(--accent-green)', fontSize: 20 }}>✓</span>
            COPIED
          </>
        ) : (
          'COPY LINK'
        )}
      </button>
    </div>
  );
}
