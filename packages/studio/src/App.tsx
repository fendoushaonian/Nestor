import { useMemo, useState } from 'react'
import { PhonePreview } from './components/PhonePreview.js'
import {
  BoltIcon,
  CheckIcon,
  GearIcon,
  NestLogo,
  PlusIcon,
  PuzzleIcon,
  TemplatesIcon,
} from './components/icons.js'
import { accents, features, platforms, templates } from './data.js'

type Section = 'new' | 'templates' | 'plugins' | 'settings'

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'new', label: 'New App', icon: <PlusIcon size={18} /> },
  { id: 'templates', label: 'Templates', icon: <TemplatesIcon size={18} /> },
  { id: 'plugins', label: 'Plugins', icon: <PuzzleIcon size={18} /> },
  { id: 'settings', label: 'Settings', icon: <GearIcon size={18} /> },
]

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function App() {
  const [section, setSection] = useState<Section>('new')
  const [name, setName] = useState('my-app')
  const [template, setTemplate] = useState('mobile')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(['ios', 'android']),
  )
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set(['nav', 'ui']))
  const [accent, setAccent] = useState(accents[0].value)
  const [copied, setCopied] = useState(false)

  const nameValid = NAME_RE.test(name.trim())

  const toggle = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }

  const command = useMemo(() => {
    const safeName = name.trim() || 'my-app'
    const lines = [`nestor create ${safeName} -t ${template}`]
    const feats = features.filter((f) => selectedFeatures.has(f.id)).map((f) => f.id)
    if (feats.length) lines.push(`cd ${safeName} && nestor add ${feats.join(' ')}`)
    return lines
  }, [name, template, selectedFeatures])

  const copy = () => {
    void navigator.clipboard?.writeText(command.join('\n'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="window" style={{ ['--accent' as string]: accent }}>
      <div className="titlebar">
        <div className="traffic">
          <span className="light red" />
          <span className="light yellow" />
          <span className="light green" />
        </div>
        <div className="titlebar-title">
          <NestLogo size={18} />
          Nestor Studio
        </div>
        <div className="titlebar-spacer" />
        <button className="toolbar-btn">
          <BoltIcon size={14} />
          Run
        </button>
      </div>

      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-group">Workspace</div>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item${section === item.id ? ' active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <div className="sidebar-footer">
            <NestLogo size={18} />
            Nestor v0.1.0
          </div>
        </aside>

        {section === 'new' ? (
          <main className="content">
            <div>
              <div className="page-head">
                <h1>Create a new app</h1>
                <p>Ship to iOS &amp; Android from one TypeScript codebase.</p>
              </div>

              <div className="section">
                <p className="section-label">
                  <span className="step">1</span> App name
                </p>
                <input
                  className="field"
                  value={name}
                  spellCheck={false}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-app"
                />
                <div className={`field-hint${name && !nameValid ? ' error' : ''}`}>
                  {name && !nameValid
                    ? 'Use lowercase letters, numbers and dashes (e.g. my-app).'
                    : 'Lowercase, dash-separated. This becomes the project folder & bundle id.'}
                </div>
              </div>

              <div className="section">
                <p className="section-label">
                  <span className="step">2</span> Platforms
                </p>
                <div className="card-grid cols-2">
                  {platforms.map((p) => {
                    const on = selectedPlatforms.has(p.id)
                    return (
                      <button
                        key={p.id}
                        className={`pick-card${on ? ' selected' : ''}`}
                        onClick={() => setSelectedPlatforms((s) => toggle(s, p.id))}
                      >
                        {on && (
                          <span className="check">
                            <CheckIcon size={13} />
                          </span>
                        )}
                        <span className="glyph">{p.icon}</span>
                        <span className="meta">
                          <span className="title">{p.name}</span>
                          <span className="desc">
                            {p.id === 'ios' ? 'iPhone & iPad' : 'Phones & tablets'}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="section">
                <p className="section-label">
                  <span className="step">3</span> Template
                </p>
                <div className="card-grid">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      className={`pick-card${template === t.id ? ' selected' : ''}`}
                      onClick={() => setTemplate(t.id)}
                    >
                      {template === t.id && (
                        <span className="check">
                          <CheckIcon size={13} />
                        </span>
                      )}
                      <span className="glyph">{t.icon}</span>
                      <span className="meta">
                        <span className="title">
                          {t.name} {t.recommended && <span className="badge">RECOMMENDED</span>}
                        </span>
                        <span className="desc">{t.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="section">
                <p className="section-label">
                  <span className="step">4</span> Features
                </p>
                <div className="chips">
                  {features.map((f) => {
                    const on = selectedFeatures.has(f.id)
                    return (
                      <button
                        key={f.id}
                        className={`chip${on ? ' selected' : ''}`}
                        onClick={() => setSelectedFeatures((s) => toggle(s, f.id))}
                      >
                        {f.icon}
                        {f.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="section">
                <p className="section-label">
                  <span className="step">5</span> Accent
                </p>
                <div className="swatches">
                  {accents.map((a) => (
                    <button
                      key={a.value}
                      title={a.name}
                      className={`swatch${accent === a.value ? ' selected' : ''}`}
                      style={{ background: a.value }}
                      onClick={() => setAccent(a.value)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <aside className="preview">
              <PhonePreview
                appName={name}
                accent={accent}
                hasAuth={selectedFeatures.has('auth')}
                hasNav={selectedFeatures.has('nav')}
                hasUi={selectedFeatures.has('ui')}
              />
              <div className="phone-platforms">
                {platforms
                  .filter((p) => selectedPlatforms.has(p.id))
                  .map((p) => (
                    <span key={p.id} className="plat-pill">
                      {p.icon}
                      {p.name}
                    </span>
                  ))}
              </div>

              <div className="command">
                <div className="command-head">
                  <span>Terminal</span>
                  <button className="copy-btn" onClick={copy}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code>
                  {command.map((line, i) => (
                    <Line key={i} text={line} />
                  ))}
                </code>
              </div>

              <div className="summary">
                <h4>What you&apos;ll get</h4>
                <ul>
                  <li>
                    <CheckIcon size={14} /> A runnable {template === 'mobile' ? 'Expo' : 'Vite'}{' '}
                    project <code>{name.trim() || 'my-app'}/</code>
                  </li>
                  {selectedFeatures.has('nav') && (
                    <li>
                      <CheckIcon size={14} /> Navigation in <code>src/navigation</code>
                    </li>
                  )}
                  {selectedFeatures.has('auth') && (
                    <li>
                      <CheckIcon size={14} /> Auth scaffold in <code>src/auth</code>
                    </li>
                  )}
                  {selectedFeatures.has('ui') && (
                    <li>
                      <CheckIcon size={14} /> UI tokens in <code>src/ui</code>
                    </li>
                  )}
                  {selectedFeatures.has('vitest') && (
                    <li>
                      <CheckIcon size={14} /> Vitest test setup
                    </li>
                  )}
                </ul>
              </div>

              <button className="cta" disabled={!nameValid}>
                Generate app
              </button>
            </aside>
          </main>
        ) : (
          <main className="content">
            <Placeholder section={section} />
          </main>
        )}
      </div>
    </div>
  )
}

function Line({ text }: { text: string }) {
  const tokens = text.split(' ').map((tok, i) => {
    let cls = 'tok-arg'
    if (tok === 'nestor' || tok === 'create' || tok === 'add' || tok === 'cd' || tok === '&&')
      cls = 'tok-cmd'
    else if (tok.startsWith('-')) cls = 'tok-flag'
    return (
      <span key={i} className={cls}>
        {tok}{' '}
      </span>
    )
  })
  return (
    <span>
      <span style={{ color: '#5b5b61' }}>$ </span>
      {tokens}
      {'\n'}
    </span>
  )
}

function Placeholder({ section }: { section: Section }) {
  const copy: Record<string, { title: string; body: string; icon: React.ReactNode }> = {
    templates: {
      title: 'Templates',
      body: 'Mobile (Expo) and Web (Vite) ship built-in. Drop your own under templates/.',
      icon: <TemplatesIcon size={40} />,
    },
    plugins: {
      title: 'Plugins',
      body: 'Navigation, Auth, UI Kit and Tests queue dependencies, files and blueprints.',
      icon: <PuzzleIcon size={40} />,
    },
    settings: {
      title: 'Settings',
      body: 'Package manager, default accent and template preferences live here.',
      icon: <GearIcon size={40} />,
    },
  }
  const c = copy[section] ?? copy.templates
  return (
    <div className="placeholder">
      <span style={{ color: 'var(--accent)' }}>{c.icon}</span>
      <h2>{c.title}</h2>
      <p>{c.body}</p>
    </div>
  )
}
