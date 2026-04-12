import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';
import type { Invite, InviteList } from '../api/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
}

export function InvitesPage() {
  const [inviteData, setInviteData] = useState<InviteList | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.listInvites().then(setInviteData).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const invite = await api.createInvite();
      setExpandedCode(invite.code);
      api.listInvites().then(setInviteData).catch(() => {});
    } catch { /* quota exceeded */ }
    setGenerating(false);
  };

  const copyUrl = (code: string) => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const remaining = inviteData ? inviteData.quota - inviteData.invites.length : 0;
  const used = inviteData?.invites.filter(i => i.used_by_username) ?? [];
  const pending = inviteData?.invites.filter(i => !i.used_by_username) ?? [];

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      <div className="nerv-divider" style={{ marginBottom: 24 }}>
        <span>INVITES</span>
      </div>

      {/* Generate button */}
      {remaining > 0 ? (
        <button
          className="btn btn-primary btn-full"
          style={{
            minHeight: 56,
            fontSize: 16,
            letterSpacing: '2px',
            marginBottom: 8,
            ['--btn-cut' as string]: '10px',
          }}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? '...' : '+ Invite'}
        </button>
      ) : inviteData ? (
        <div className="card" style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{
            fontSize: 13,
            fontFamily: 'var(--font-data)',
            color: 'var(--text-secondary)',
            letterSpacing: '1px',
          }}>
            ALL INVITES USED
          </span>
        </div>
      ) : null}

      {/* Quota — subtle */}
      {inviteData && (
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          fontFamily: 'var(--font-data)',
          color: 'var(--text-secondary)',
          letterSpacing: '1px',
          marginBottom: 24,
          opacity: 0.6,
        }}>
          {remaining} invite{remaining !== 1 ? 's' : ''} available
        </div>
      )}

      {/* Pending invites */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 8 }}>PENDING</div>
          {pending.map(invite => {
            const isExpanded = expandedCode === invite.code;
            return (
              <div key={invite.id} style={{ marginBottom: 4 }}>
                <div
                  className="card"
                  onClick={() => setExpandedCode(isExpanded ? null : invite.code)}
                  style={{
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--bg-elevated)' : undefined,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <span style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 11,
                        color: 'var(--accent-primary)',
                        textShadow: 'var(--glow-primary-text)',
                        letterSpacing: '1px',
                      }}>
                        PENDING
                      </span>
                      <div style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        marginTop: 2,
                      }}>
                        {formatDate(invite.created_at)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      transition: 'transform 0.15s',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                    }}>
                      ▾
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      style={{ marginTop: 16 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <QRCodeSVG
                          value={`${window.location.origin}/join/${invite.code}`}
                          size={180}
                          bgColor="transparent"
                          fgColor="#e8a832"
                          level="M"
                        />
                      </div>
                      <button
                        className="btn btn-secondary btn-full"
                        style={{ fontSize: 13, minHeight: 44, letterSpacing: '1px' }}
                        onClick={() => copyUrl(invite.code)}
                      >
                        {copied ? 'COPIED' : 'COPY LINK'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Joined users */}
      {used.length > 0 && (
        <div>
          <div className="label" style={{ marginBottom: 8 }}>JOINED</div>
          {used.map(invite => (
            <div key={invite.id} className="card" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {invite.used_by_username!.toUpperCase()}
                </div>
                {invite.used_at && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatDate(invite.used_at)}
                  </div>
                )}
              </div>
              <span style={{
                fontFamily: 'var(--font-data)',
                fontSize: 11,
                color: 'var(--accent-green)',
                textShadow: 'var(--glow-green-text)',
                letterSpacing: '1px',
              }}>
                JOINED
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
