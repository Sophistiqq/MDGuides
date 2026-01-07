export type Guide = {
  id: string;
  title: string;
  content: string;
};

export type TrashedGuide = Guide & {
  deletedAt: number;
};

export type Version = {
  timestamp: number;
  content: string;
  author?: string;
};

export async function getGuidesDir() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle('guides', { create: true });
}

export async function getTrashDir() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle('trash', { create: true });
}

export async function getVersionsDir() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle('versions', { create: true });
}

export async function listGuides() {
  const dir = await getGuidesDir();
  const guides: Guide[] = [];

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

export async function listTrashedGuides() {
  const dir = await getTrashDir();
  const guides: TrashedGuide[] = [];

  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file' || !name.endsWith('.md')) continue;

    const file = await handle.getFile();
    const content = await file.text();
    
    // Extract metadata from the first line if it exists
    const lines = content.split('\n');
    let deletedAt = file.lastModified; // fallback to file modification time
    let actualContent = content;
    
    if (lines[0].startsWith('<!-- DELETED_AT:')) {
      const match = lines[0].match(/<!-- DELETED_AT:(\d+) -->/);
      if (match) {
        deletedAt = parseInt(match[1]);
        actualContent = lines.slice(1).join('\n').trim();
      }
    }

    guides.push({
      id: name.replace('.md', ''),
      title: extractTitle(actualContent) ?? name.replace('.md', ''),
      content: actualContent,
      deletedAt
    });
  }

  // Sort by deletion date, newest first
  guides.sort((a, b) => b.deletedAt - a.deletedAt);

  return guides;
}

export async function updateGuide(id: string, content: string) {
  // Save current version to history before updating
  await saveVersion(id, content);

  const dir = await getGuidesDir();
  const filename = `${id}.md`;
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteGuide(id: string) {
  // Move to trash instead of deleting
  const guidesDir = await getGuidesDir();
  const trashDir = await getTrashDir();
  
  // Read the guide content
  const fileHandle = await guidesDir.getFileHandle(`${id}.md`);
  const file = await fileHandle.getFile();
  const content = await file.text();
  
  // Save to trash with deletion timestamp
  const deletedAt = Date.now();
  const trashContent = `<!-- DELETED_AT:${deletedAt} -->\n${content}`;
  const trashHandle = await trashDir.getFileHandle(`${id}.md`, { create: true });
  const writable = await trashHandle.createWritable();
  await writable.write(trashContent);
  await writable.close();
  
  // Remove from guides directory
  await guidesDir.removeEntry(`${id}.md`);
}

export async function restoreGuide(id: string) {
  const trashDir = await getTrashDir();
  const guidesDir = await getGuidesDir();
  
  // Read from trash
  const trashHandle = await trashDir.getFileHandle(`${id}.md`);
  const file = await trashHandle.getFile();
  let content = await file.text();
  
  // Remove metadata line if it exists
  const lines = content.split('\n');
  if (lines[0].startsWith('<!-- DELETED_AT:')) {
    content = lines.slice(1).join('\n').trim();
  }
  
  // Restore to guides
  const guideHandle = await guidesDir.getFileHandle(`${id}.md`, { create: true });
  const writable = await guideHandle.createWritable();
  await writable.write(content);
  await writable.close();
  
  // Remove from trash
  await trashDir.removeEntry(`${id}.md`);
}

export async function permanentlyDeleteGuide(id: string) {
  const trashDir = await getTrashDir();
  await trashDir.removeEntry(`${id}.md`);
  
  // Also delete version history
  try {
    const versionsDir = await getVersionsDir();
    const versionDirHandle = await versionsDir.getDirectoryHandle(id);
    
    // Delete all version files
    for await (const [name] of versionDirHandle.entries()) {
      await versionDirHandle.removeEntry(name);
    }
    
    // Delete the version directory
    await versionsDir.removeEntry(id);
  } catch (error) {
    // Version directory might not exist, that's okay
    console.log('No version history to delete');
  }
}

export async function saveVersion(guideId: string, content: string) {
  const versionsDir = await getVersionsDir();
  const guideVersionDir = await versionsDir.getDirectoryHandle(guideId, { create: true });
  
  const timestamp = Date.now();
  const filename = `${timestamp}.md`;
  
  const fileHandle = await guideVersionDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function getVersionHistory(guideId: string): Promise<Version[]> {
  const versions: Version[] = [];
  
  try {
    const versionsDir = await getVersionsDir();
    const guideVersionDir = await versionsDir.getDirectoryHandle(guideId);
    
    for await (const [name, handle] of guideVersionDir.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.md')) continue;
      
      const timestamp = parseInt(name.replace('.md', ''));
      const file = await handle.getFile();
      const content = await file.text();
      
      versions.push({
        timestamp,
        content
      });
    }
    
    // Sort by timestamp descending (newest first)
    versions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    // No version history exists yet
    console.log('No version history found');
  }
  
  return versions;
}

function extractTitle(md: string) {
  const match = md.match(/^#\s+(.+)$/m);
  return match?.[1];
}

export async function exportAllGuides() {
  const guides = await listGuides();
  
  if (guides.length === 0) {
    alert('No guides to export');
    return;
  }

  // Create a zip-like structure using JSZip alternative (simple approach)
  // Since we can't use external libraries, we'll download each file
  for (const guide of guides) {
    const blob = new Blob([guide.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${guide.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Small delay between downloads to prevent browser blocking
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export async function exportAllData() {
  const guides = await listGuides();
  const trashedGuides = await listTrashedGuides();
  
  // Create a complete backup as JSON
  const backup = {
    exportDate: new Date().toISOString(),
    guides: guides,
    trash: trashedGuides,
    versions: {} as Record<string, Version[]>
  };
  
  // Get version history for each guide
  for (const guide of guides) {
    const versions = await getVersionHistory(guide.id);
    if (versions.length > 0) {
      backup.versions[guide.id] = versions;
    }
  }
  
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guidy-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}