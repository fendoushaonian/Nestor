import './style.css'
import { NestorApiError, NestorClient, type FileObject } from './lib/nestor'

const baseUrl = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000'

// One client for the whole app: token storage + auto-refresh are handled inside.
const api = new NestorClient({
  baseUrl,
  onUnauthorized: () => render(),
})

const app = document.querySelector<HTMLDivElement>('#app')!

function describeError(err: unknown): string {
  if (err instanceof NestorApiError) return `[${err.code}] ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

/** Escape user-controlled text before interpolating it into an innerHTML string. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function render(): Promise<void> {
  app.innerHTML = api.isAuthenticated() ? dashboardView() : loginView()
  if (api.isAuthenticated()) {
    bindDashboard()
    await Promise.all([loadProfile(), loadFiles()])
  } else {
    bindLogin()
  }
}

function loginView(): string {
  return `
    <main class="app">
      <h1>{{name}}</h1>
      <p>Full-stack starter wired to a Nestor backend at <code>${baseUrl}/api</code>.</p>
      <section>
        <h2>Sign in</h2>
        <label for="id">Username / email / phone</label>
        <input id="id" value="admin" />
        <label for="pw">Password</label>
        <input id="pw" type="password" value="" />
        <button id="login">Log in</button>
        <p class="status error" id="login-status"></p>
      </section>
    </main>`
}

function dashboardView(): string {
  return `
    <main class="app">
      <h1>{{name}}</h1>
      <section>
        <h2>Profile</h2>
        <p class="status" id="profile">Loading…</p>
        <button id="logout">Log out</button>
      </section>
      <section>
        <h2>Upload a file</h2>
        <input id="file" type="file" />
        <button id="upload">Upload</button>
        <p class="status" id="upload-status"></p>
      </section>
      <section>
        <h2>Files</h2>
        <ul id="files"><li>Loading…</li></ul>
      </section>
    </main>`
}

function bindLogin(): void {
  const status = document.querySelector<HTMLParagraphElement>('#login-status')!
  document.querySelector<HTMLButtonElement>('#login')!.addEventListener('click', async () => {
    const identifier = document.querySelector<HTMLInputElement>('#id')!.value
    const password = document.querySelector<HTMLInputElement>('#pw')!.value
    status.textContent = ''
    try {
      await api.auth.login({ identifier, password })
      await render()
    } catch (err) {
      status.textContent = describeError(err)
    }
  })
}

function bindDashboard(): void {
  document.querySelector<HTMLButtonElement>('#logout')!.addEventListener('click', async () => {
    await api.auth.logout()
    await render()
  })

  document.querySelector<HTMLButtonElement>('#upload')!.addEventListener('click', async () => {
    const input = document.querySelector<HTMLInputElement>('#file')!
    const status = document.querySelector<HTMLParagraphElement>('#upload-status')!
    const file = input.files?.[0]
    if (!file) {
      status.textContent = 'Pick a file first.'
      return
    }
    status.textContent = 'Uploading…'
    try {
      const uploaded = await api.files.upload(file, file.name)
      status.textContent = `Uploaded ${uploaded.originalName}`
      await loadFiles()
    } catch (err) {
      status.textContent = describeError(err)
    }
  })
}

async function loadProfile(): Promise<void> {
  const el = document.querySelector<HTMLParagraphElement>('#profile')
  if (!el) return
  try {
    const me = await api.auth.profile()
    el.textContent = `${me.username} — roles: ${me.roles.join(', ') || 'none'}`
  } catch (err) {
    el.textContent = describeError(err)
  }
}

async function loadFiles(): Promise<void> {
  const list = document.querySelector<HTMLUListElement>('#files')
  if (!list) return
  try {
    const page = await api.files.list({ page: 1, pageSize: 10 })
    list.innerHTML =
      page.list.length === 0
        ? '<li>No files yet.</li>'
        : page.list
            .map(
              (f: FileObject) =>
                `<li><a href="${escapeHtml(api.files.rawUrl(f.id))}">${escapeHtml(f.originalName)}</a> (${f.size} B)</li>`,
            )
            .join('')
  } catch (err) {
    list.innerHTML = `<li class="error">${escapeHtml(describeError(err))}</li>`
  }
}

void render()
