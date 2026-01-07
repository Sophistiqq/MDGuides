# Guidy 📖

**Guidy** is a local-first, privacy-focused Markdown guide manager built with **Svelte 5** and **Vite**. It leverages the **Origin Private File System (OPFS)** to store your documents directly in the browser with native file system performance, functioning as a fully offline-capable Progressive Web App (PWA).

## ✨ Key Features

* **Local-First Storage**: All data is stored locally using OPFS. No account or backend server required.
* **Markdown Editor**: robust editing experience using **CodeMirror** with live HTML preview via **Marked**.
* **Organization**:
    * Create and manage custom **Folders**.
    * Move guides between folders via context menus.
* **Version Control**:
    * Automatic version history for every guide.
    * Easily restore previous versions of your documents.
* **Trash Bin**: Soft-delete system allowing you to restore accidentally deleted guides.
* **Data Portability**:
    * **Export All**: Download all guides as individual `.md` files.
    * **Full Backup**: Export a complete JSON backup including folder structures and version history.
* **PWA Support**: Installable on desktop and mobile devices for an app-like experience.

## 🛠️ Tech Stack

* **Framework**: [Svelte 5](https://svelte.dev/) (using Runes syntax)
* **Build Tool**: [Vite](https://vitejs.dev/)
* **Language**: TypeScript
* **Storage**: [OPFS (File System API)](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
* **Editor**: [CodeMirror 6](https://codemirror.net/)
* **Styling**: Native CSS (Scoped Svelte styles)

## 🚀 Getting Started

### Prerequisites

* Node.js (Latest LTS recommended)
* npm (comes with Node.js)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/guidy.git](https://github.com/your-username/guidy.git)
    cd guidy
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    Open your browser to the URL shown in the terminal (usually `http://localhost:5173`).

### Building for Production

To create a production-ready build:

```bash
npm run build
To preview the production build locally:

Bash

npm run preview
📂 Project Structure
Plaintext

src/
├── assets/          # Static assets (icons, SVGs)
├── components/      # Svelte UI Components
│   ├── AddGuide.svelte        # Creation interface
│   ├── ContextMenu.svelte     # Right-click menus
│   ├── GuideViewer.svelte     # View/Edit/History logic
│   ├── Sidebar.svelte         # Navigation & Folder management
│   ├── TrashBin.svelte        # Deleted items management
│   └── VersionHistory.svelte  # Version rollback UI
├── lib/
│   └── opfs.ts      # Core logic for File System Access (CRUD)
├── App.svelte       # Main application layout
└── main.ts          # Entry point
💾 Backup & Data Management
Since Guidy runs entirely in the browser using OPFS:

Clearing Browser Data: Clearing your browser's "Site Data" or "Storage" will delete your guides.

Backups: Use the "Full Backup" button in the sidebar regularly to download a JSON snapshot of your data.

Export: You can export guides as standard Markdown files for use in other editors (Obsidian, VS Code, etc.).
