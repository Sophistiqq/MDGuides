import { Marked } from 'marked';
import { notifications } from './notifications';

const marked = new Marked();

// Custom renderer to add copy button to code blocks
const renderer = {
  code({ text, lang }: { text: string; lang?: string }) {
    const escapedText = text.replace(/"/g, '&quot;');
    return `
      <div class="code-block-container group relative my-4">
        <div class="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            class="copy-code-btn btn btn-square btn-ghost btn-xs bg-base-200/50 hover:bg-base-300"
            data-code="${escapedText}"
            title="Copy code"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <pre><code class="language-${lang || 'text'}">${text}</code></pre>
      </div>
    `;
  }
};

marked.use({ renderer });

export function renderMarkdown(md: string): string {
  return marked.parse(md) as string;
}

// Global click handler for copy buttons
export function setupMarkdownListeners() {
  const handleCopy = async (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.copy-code-btn') as HTMLButtonElement;
    if (!btn) return;

    const code = btn.getAttribute('data-code');
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        notifications.success('Code copied to clipboard', 2000);
        
        // Visual feedback
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
        setTimeout(() => {
          btn.innerHTML = originalContent;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy!', err);
        notifications.error('Failed to copy code');
      }
    }
  };

  document.addEventListener('click', handleCopy);
  return () => document.removeEventListener('click', handleCopy);
}
