import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main class="app">
    <h1>{{name}}</h1>
    <p>Scaffolded with <strong>Nestor</strong> 🪺</p>
    <p>
      Edit <code>src/main.ts</code> and save to reload.<br />
      Generate code with <code>npx nestor generate page Home</code>.
    </p>
  </main>
`
