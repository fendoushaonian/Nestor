/**
 * A hand-drawn SVG iPhone (Dynamic Island, side buttons) with a live screen
 * rendered inside via <foreignObject>. The screen reflects the wizard state:
 * app name, accent color, and which feature plugins are enabled.
 */
import { NestLogo } from './icons.js'

export type PhonePreviewProps = {
  appName: string
  accent: string
  hasAuth: boolean
  hasNav: boolean
  hasUi: boolean
}

const W = 280
const H = 568

export function PhonePreview({ appName, accent, hasAuth, hasNav, hasUi }: PhonePreviewProps) {
  const title = appName.trim() || 'your-app'
  const initial =
    title
      .replace(/[^a-zA-Z0-9]/g, '')
      .charAt(0)
      .toUpperCase() || 'A'

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="App preview"
      style={{ filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.35))' }}
    >
      {/* side buttons */}
      <rect x="0" y="150" width="3" height="34" rx="1.5" fill="#1a1a1f" />
      <rect x="0" y="200" width="3" height="58" rx="1.5" fill="#1a1a1f" />
      <rect x="0" y="270" width="3" height="58" rx="1.5" fill="#1a1a1f" />
      <rect x={W - 3} y="220" width="3" height="80" rx="1.5" fill="#1a1a1f" />

      {/* titanium frame */}
      <rect x="3" y="2" width={W - 6} height={H - 4} rx="46" fill="#2b2b30" />
      <rect x="6" y="5" width={W - 12} height={H - 10} rx="43" fill="#0b0b0f" />

      {/* screen */}
      <rect x="13" y="12" width={W - 26} height={H - 24} rx="34" fill="#ffffff" />

      <foreignObject x="13" y="12" width={W - 26} height={H - 24}>
        <div
          {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 34,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
            background: `linear-gradient(180deg, ${hexToSoft(accent)} 0%, #ffffff 42%)`,
          }}
        >
          {/* status bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 22px 6px',
              fontSize: 12,
              fontWeight: 700,
              color: '#1d1d1f',
            }}
          >
            <span>9:41</span>
            <span style={{ letterSpacing: 1 }}>● ● ● ▮▮▮</span>
          </div>

          {/* dynamic island */}
          <div
            style={{
              alignSelf: 'center',
              width: 92,
              height: 26,
              borderRadius: 16,
              background: '#0b0b0f',
              marginTop: -28,
              marginBottom: 14,
            }}
          />

          {/* hero */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '0 22px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 18,
                background: accent,
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: 38,
                fontWeight: 800,
                boxShadow: `0 12px 26px ${hexToSoft(accent, 0.5)}`,
              }}
            >
              {initial}
            </div>
            <div
              style={{ fontSize: 21, fontWeight: 800, color: '#1d1d1f', wordBreak: 'break-word' }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: '#6e6e73',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              Built with Nestor
              <span style={{ display: 'inline-flex', transform: 'translateY(2px)' }}>
                <NestLogo size={15} />
              </span>
            </div>

            {hasUi && (
              <div
                style={{
                  marginTop: 10,
                  width: '100%',
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: '#fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>UI Kit</div>
                <div style={{ fontSize: 11, color: '#9b9ba1' }}>Themed components & tokens</div>
              </div>
            )}

            {hasAuth && (
              <button
                style={{
                  marginTop: 6,
                  width: '100%',
                  height: 40,
                  border: 'none',
                  borderRadius: 12,
                  background: accent,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Sign in
              </button>
            )}
          </div>

          {/* bottom tab bar */}
          {hasNav && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '10px 0 14px',
                borderTop: '0.5px solid rgba(0,0,0,0.08)',
                background: 'rgba(255,255,255,0.9)',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {[
                { label: 'Home', on: true },
                { label: 'Explore', on: false },
                { label: 'Profile', on: false },
              ].map((t) => (
                <div
                  key={t.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    color: t.on ? accent : '#9b9ba1',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: t.on ? accent : '#c7c7cc',
                    }}
                  />
                  {t.label}
                </div>
              ))}
            </div>
          )}

          {/* home indicator */}
          <div
            style={{
              alignSelf: 'center',
              width: 110,
              height: 5,
              borderRadius: 3,
              background: '#1d1d1f',
              opacity: 0.85,
              margin: '6px 0 10px',
            }}
          />
        </div>
      </foreignObject>
    </svg>
  )
}

function hexToSoft(hex: string, alpha = 0.16): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
