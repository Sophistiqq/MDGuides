# .gitignore

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
dev-dist
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

# .vscode\extensions.json

```json
{
  "recommendations": ["svelte.svelte-vscode"]
}

```

# index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Guidy</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>

```

# package.json

```json
{
  "name": "guide-ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^6.2.1",
    "@tsconfig/svelte": "^5.0.5",
    "@types/node": "^24.6.2",
    "@vite-pwa/assets-generator": "^1.0.2",
    "svelte": "^5.39.9",
    "svelte-check": "^4.3.2",
    "typescript": "~5.9.3",
    "vite": "^7.1.9",
    "vite-plugin-pwa": "^1.1.0",
    "workbox-window": "^7.4.0"
  },
  "resolutions": {
    "sharp": "^0.33.5",
    "sharp-ico": "^0.1.5"
  },
  "dependencies": {
    "marked": "^17.0.1"
  }
}

```

# public\favicon.svg

This is a file of the type: SVG Image

# pwa-assets.config.ts

```ts
import {
    defineConfig,
    minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
    headLinkOptions: {
        preset: '2023',
    },
    preset,
    images: ['public/favicon.svg'],
})

```

# README.md

```md
# Svelte + TS + Vite

This template should help get you started developing with Svelte and TypeScript in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

## Need an official Svelte framework?

Check out [SvelteKit](https://github.com/sveltejs/kit#readme), which is also powered by Vite. Deploy anywhere with its serverless-first approach and adapt to various platforms, with out of the box support for TypeScript, SCSS, and Less, and easily-added support for mdsvex, GraphQL, PostCSS, Tailwind CSS, and more.

## Technical considerations

**Why use this over SvelteKit?**

- It brings its own routing solution which might not be preferable for some users.
- It is first and foremost a framework that just happens to use Vite under the hood, not a Vite app.

This template contains as little as possible to get started with Vite + TypeScript + Svelte, while taking into account the developer experience with regards to HMR and intellisense. It demonstrates capabilities on par with the other `create-vite` templates and is a good starting point for beginners dipping their toes into a Vite + Svelte project.

Should you later need the extended capabilities and extensibility provided by SvelteKit, the template has been structured similarly to SvelteKit so that it is easy to migrate.

**Why `global.d.ts` instead of `compilerOptions.types` inside `jsconfig.json` or `tsconfig.json`?**

Setting `compilerOptions.types` shuts out all other types not explicitly listed in the configuration. Using triple-slash references keeps the default TypeScript setting of accepting type information from the entire workspace, while also adding `svelte` and `vite/client` type information.

**Why include `.vscode/extensions.json`?**

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

**Why enable `allowJs` in the TS template?**

While `allowJs: false` would indeed prevent the use of `.js` files in the project, it does not prevent the use of JavaScript syntax in `.svelte` files. In addition, it would force `checkJs: false`, bringing the worst of both worlds: not being able to guarantee the entire codebase is TypeScript, and also having worse typechecking for the existing JavaScript. In addition, there are valid use cases in which a mixed codebase may be relevant.

**Why is HMR not preserving my local component state?**

HMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/rixo/svelte-hmr#svelte-hmr).

If you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

\`\`\`ts
// store.ts
// An extremely simple external store
import { writable } from 'svelte/store'
export default writable(0)
\`\`\`

```

# src\app.css

```css

```

# src\App.svelte

```svelte
<script lang="ts">
    import { onMount } from 'svelte';
  import Sidebar from './components/Sidebar.svelte';
  import { listGuides } from './lib/opfs';
  import { marked } from 'marked';
import AddGuide from './components/AddGuide.svelte';
  type Guide = {
    id: string;
    title: string;
    content: string;
  };

  let guides = $state<Guide[]>([]);
  let selectedGuide = $state<Guide | null>(null);

  onMount(async () => {
    guides.push(...await listGuides());
  });

  async function refreshGuides() {
    guides.length = 0;
    guides.push(...await listGuides());
  }

  function handleSelect(id: string) {
    selectedGuide = guides.find(g => g.id === id) ?? null;
  }
</script>

<div class="layout">
  <Sidebar
    guides={guides.map(({ id, title }) => ({ id, title }))}
    onSelect={handleSelect}
  />
  <AddGuide onNewGuide={refreshGuides} />


  <main class="content">
    {#if selectedGuide}
      <div class="md-content" use:html={marked(selectedGuide.content)}></div>
    {:else}
      <p>Select a guide</p>
    {/if}
  </main>
</div>

<style>
  .layout {
    display: flex;
    height: 100vh;
  }

  .content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .md-content h1, h2, h3 {
    margin-top: 1rem;
  }

  .md-content ul {
    padding-left: 1.5rem;
  }

  .md-content pre {
    background: #f5f5f5;
    padding: 0.5rem;
    overflow-x: auto;
  }
</style>

```

# src\assets\svelte.svg

This is a file of the type: SVG Image

# src\components\AddGuide.svelte

```svelte
<script lang="ts">
  import { getGuidesDir } from '../lib/opfs';

  let title = $state('');
  let steps = $state('');

  let onAdd = $props<{ onNewGuide: () => void }>();

  async function addGuide() {
    if (!title.trim()) return;

    let mdContent = `# ${title}\n\n${steps
      .split('\n')
      .map((s) => `- ${s}`)
      .join('\n')}`;

    let dir = await getGuidesDir();
    let fileHandle = await dir.getFileHandle(`${title.replace(/\s+/g, '_')}.md`, { create: true });
    let writable = await fileHandle.createWritable();
    await writable.write(mdContent);
    await writable.close();

    title = '';
    steps = '';
    onNewGuide();
  }
</script>

<div class="add-guide">
  <h3>Add New Guide</h3>

  <input
    placeholder="Title"
    bind:value={title}
  />

  <textarea
    placeholder="Enter each step on a new line"
    bind:value={steps}
  ></textarea>

  <button on:click={addGuide}>Add Guide</button>
</div>

<style>
  .add-guide {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem;
  }

  input, textarea {
    padding: 0.5rem;
    font-size: 1rem;
  }

  textarea {
    resize: vertical;
    height: 6rem;
  }

  button {
    align-self: flex-start;
    padding: 0.5rem 1rem;
  }
</style>

```

# src\components\Sidebar.svelte

```svelte
<script lang="ts">
  type Guide = {
    id: string;
    title: string;
  };

  const { guides, onSelect } = $props<{
    guides: Guide[];
    onSelect: (id: string) => void;
  }>();

  let selectedId = $state<string | null>(null);

  function selectGuide(id: string) {
    selectedId = id;
    onSelect(id);
  }
</script>

<aside class="sidebar">
  <h2 class="title">Guides</h2>

  <ul class="list">
    {#each guides as guide}
      <li>
        <button
          class:selected={guide.id === selectedId}
          onclick={() => selectGuide(guide.id)}
        >
          {guide.title}
        </button>
      </li>
    {/each}
  </ul>
</aside>

<style>
  .sidebar {
    width: 260px;
    border-right: 1px solid #ddd;
    padding: 1rem;
  }

  .title {
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  button {
    width: 100%;
    text-align: left;
    padding: 0.5rem;
    border: none;
    background: none;
    cursor: pointer;
  }

  button.selected {
    background: #eee;
    font-weight: 500;
  }
</style>

```

# src\lib\opfs.ts

```ts
export async function getGuidesDir() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle('guides', { create: true });
}

export async function listGuides() {
  const dir = await getGuidesDir();
  const guides: { id: string; title: string; content: string }[] = [];

  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file' || !name.endsWith('.md')) continue;

    const file = await handle.getFile();
    const content = await file.text();

    guides.push({
      id: name.replace('.md', ''),
      title: extractTitle(content) ?? name.replace('.md', ''),
      content
    });
  }

  return guides;
}

function extractTitle(md: string) {
  const match = md.match(/^#\s+(.+)$/m);
  return match?.[1];
}

```

# src\main.ts

```ts
import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app

```

# src\vite-env.d.ts

```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/svelte" />

```

# svelte.config.js

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),
}

```

# tsconfig.app.json

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "types": ["svelte", "vite/client"],
    "noEmit": true,
    /**
     * Typecheck JS in `.svelte` and `.js` files by default.
     * Disable checkJs if you'd like to use dynamic types in JS.
     * Note that setting allowJs false does not prevent the use
     * of JS in `.svelte` files.
     */
    "allowJs": true,
    "checkJs": true,
    "moduleDetection": "force"
  },
  "include": ["src/**/*.ts", "src/**/*.js", "src/**/*.svelte"]
}

```

# tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}

```

# tsconfig.node.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}

```

# vite.config.ts

```ts
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'Guidy',
      short_name: 'Guidy',
      description: 'Guides',
      theme_color: '#ffffff',
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})
```

