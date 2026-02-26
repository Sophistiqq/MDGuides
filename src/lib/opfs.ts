export type Guide = {
  id: string;
  title: string;
  content: string;
  folder?: string;
};

export type Folder = {
  name: string;
  path: string;
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

export async function listFolders(): Promise<Folder[]> {
  const dir = await getGuidesDir();
  const folders: Folder[] = [];

  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'directory') {
      folders.push({
        name,
        path: name
      });
    }
  }

  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createFolder(name: string) {
  const dir = await getGuidesDir();
  const folderName = name.trim().replace(/[^a-zA-Z0-9-_\s]/g, '_');
  
  try {
    await dir.getDirectoryHandle(folderName);
    throw new Error('Folder with this name already exists');
  } catch (error: any) {
    if (error.message === 'Folder with this name already exists') {
      throw error;
    }
    await dir.getDirectoryHandle(folderName, { create: true });
  }
}

export async function renameFolder(oldName: string, newName: string) {
  const dir = await getGuidesDir();
  const sanitizedName = newName.trim().replace(/[^a-zA-Z0-9-_\s]/g, '_');
  
  const oldFolder = await dir.getDirectoryHandle(oldName);
  const newFolder = await dir.getDirectoryHandle(sanitizedName, { create: true });
  
  for await (const [name, handle] of oldFolder.entries()) {
    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile();
      const content = await file.text();
      
      const newFileHandle = await newFolder.getFileHandle(name, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      await oldFolder.removeEntry(name);
    }
  }
  
  await dir.removeEntry(oldName);
}

export async function deleteFolder(folderName: string) {
  const dir = await getGuidesDir();
  const folderHandle = await dir.getDirectoryHandle(folderName);
  
  let hasFiles = false;
  for await (const [name, handle] of folderHandle.entries()) {
    if (handle.kind === 'file') {
      hasFiles = true;
      break;
    }
  }
  
  if (hasFiles) {
    throw new Error('Folder must be empty before deletion');
  }
  
  await dir.removeEntry(folderName);
}

export async function listGuides() {
  const dir = await getGuidesDir();
  const guides: Guide[] = [];

  async function scanDirectory(dirHandle: FileSystemDirectoryHandle, folderPath: string = '') {
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && name.endsWith('.md')) {
        const file = await (handle as FileSystemFileHandle).getFile();
        const content = await file.text();

        guides.push({
          id: folderPath ? `${folderPath}/${name.replace('.md', '')}` : name.replace('.md', ''),
          title: extractTitle(content) ?? name.replace('.md', ''),
          content,
          folder: folderPath || undefined
        });
      } else if (handle.kind === 'directory') {
        await scanDirectory(handle as FileSystemDirectoryHandle, folderPath ? `${folderPath}/${name}` : name);
      }
    }
  }

  await scanDirectory(dir);
  return guides;
}

export async function moveGuideToFolder(guideId: string, targetFolder: string) {
  const guidesDir = await getGuidesDir();
  
  const parts = guideId.split('/');
  const filename = `${parts[parts.length - 1]}.md`;
  
  let currentDir = guidesDir;
  for (let i = 0; i < parts.length - 1; i++) {
    currentDir = await currentDir.getDirectoryHandle(parts[i]);
  }
  
  const fileHandle = await currentDir.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const content = await file.text();
  
  let targetDir = guidesDir;
  if (targetFolder) {
    const folderParts = targetFolder.split('/');
    for (const part of folderParts) {
      targetDir = await targetDir.getDirectoryHandle(part, { create: true });
    }
  }
  
  const newFileHandle = await targetDir.getFileHandle(filename, { create: true });
  const writable = await newFileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  
  await currentDir.removeEntry(filename);
}

export async function listTrashedGuides() {
  const dir = await getTrashDir();
  const guides: TrashedGuide[] = [];

  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file' || !name.endsWith('.md')) continue;

    const file = await (handle as FileSystemFileHandle).getFile();
    const content = await file.text();
    
    const lines = content.split('\n');
    let deletedAt = file.lastModified;
    let actualContent = content;
    let folder: string | undefined;
    
    if (lines[0].startsWith('<!-- DELETED_AT:')) {
      const match = lines[0].match(/<!-- DELETED_AT:(\d+) FOLDER:(.+?) -->/);
      if (match) {
        deletedAt = parseInt(match[1]);
        folder = match[2] === 'ROOT' ? undefined : match[2];
        actualContent = lines.slice(1).join('\n').trim();
      } else {
        const simpleMatch = lines[0].match(/<!-- DELETED_AT:(\d+) -->/);
        if (simpleMatch) {
          deletedAt = parseInt(simpleMatch[1]);
          actualContent = lines.slice(1).join('\n').trim();
        }
      }
    }

    guides.push({
      id: name.replace('.md', ''),
      title: extractTitle(actualContent) ?? name.replace('.md', ''),
      content: actualContent,
      deletedAt,
      folder
    });
  }

  guides.sort((a, b) => b.deletedAt - a.deletedAt);
  return guides;
}

export async function updateGuide(id: string, content: string) {
  await saveVersion(id, content);

  const guidesDir = await getGuidesDir();
  const parts = id.split('/');
  const filename = `${parts[parts.length - 1]}.md`;
  
  let currentDir = guidesDir;
  for (let i = 0; i < parts.length - 1; i++) {
    currentDir = await currentDir.getDirectoryHandle(parts[i]);
  }
  
  const fileHandle = await currentDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteGuide(id: string) {
  const guidesDir = await getGuidesDir();
  const trashDir = await getTrashDir();
  
  const parts = id.split('/');
  const filename = `${parts[parts.length - 1]}.md`;
  const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : undefined;
  
  let currentDir = guidesDir;
  for (let i = 0; i < parts.length - 1; i++) {
    currentDir = await currentDir.getDirectoryHandle(parts[i]);
  }
  
  const fileHandle = await currentDir.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const content = await file.text();
  
  const deletedAt = Date.now();
  const folderInfo = folder ? folder : 'ROOT';
  const trashContent = `<!-- DELETED_AT:${deletedAt} FOLDER:${folderInfo} -->\n${content}`;
  const trashHandle = await trashDir.getFileHandle(filename, { create: true });
  const writable = await trashHandle.createWritable();
  await writable.write(trashContent);
  await writable.close();
  
  await currentDir.removeEntry(filename);
}

export async function restoreGuide(id: string) {
  const trashDir = await getTrashDir();
  const guidesDir = await getGuidesDir();
  
  const trashHandle = await trashDir.getFileHandle(`${id}.md`);
  const file = await trashHandle.getFile();
  let content = await file.text();
  let targetFolder: string | undefined;
  
  const lines = content.split('\n');
  if (lines[0].startsWith('<!-- DELETED_AT:')) {
    const match = lines[0].match(/<!-- DELETED_AT:(\d+) FOLDER:(.+?) -->/);
    if (match) {
      targetFolder = match[2] === 'ROOT' ? undefined : match[2];
    }
    content = lines.slice(1).join('\n').trim();
  }
  
  let targetDir = guidesDir;
  if (targetFolder) {
    const folderParts = targetFolder.split('/');
    for (const part of folderParts) {
      targetDir = await targetDir.getDirectoryHandle(part, { create: true });
    }
  }
  
  const guideHandle = await targetDir.getFileHandle(`${id}.md`, { create: true });
  const writable = await guideHandle.createWritable();
  await writable.write(content);
  await writable.close();
  
  await trashDir.removeEntry(`${id}.md`);
}

export async function permanentlyDeleteGuide(id: string) {
  const trashDir = await getTrashDir();
  await trashDir.removeEntry(`${id}.md`);
  
  try {
    const versionsDir = await getVersionsDir();
    const cleanId = id.replace(/\//g, '_');
    const versionDirHandle = await versionsDir.getDirectoryHandle(cleanId);
    
    for await (const [name] of versionDirHandle.entries()) {
      await versionDirHandle.removeEntry(name);
    }
    
    await versionsDir.removeEntry(cleanId);
  } catch (error) {
    console.log('No version history to delete');
  }
}

export async function saveVersion(guideId: string, content: string) {
  const versionsDir = await getVersionsDir();
  const cleanId = guideId.replace(/\//g, '_');
  const guideVersionDir = await versionsDir.getDirectoryHandle(cleanId, { create: true });
  
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
    const cleanId = guideId.replace(/\//g, '_');
    const guideVersionDir = await versionsDir.getDirectoryHandle(cleanId);
    
    for await (const [name, handle] of guideVersionDir.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.md')) continue;
      
      const timestamp = parseInt(name.replace('.md', ''));
      const file = await (handle as FileSystemFileHandle).getFile();
      const content = await file.text();
      
      versions.push({
        timestamp,
        content
      });
    }
    
    versions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
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
    return;
  }

  for (const guide of guides) {
    const blob = new Blob([guide.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = guide.folder ? `${guide.folder.replace(/\//g, '_')}_${guide.id.split('/').pop()}.md` : `${guide.id}.md`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export async function exportAllData() {
  const guides = await listGuides();
  const trashedGuides = await listTrashedGuides();
  const folders = await listFolders();
  
  const backup = {
    exportDate: new Date().toISOString(),
    guides: guides,
    folders: folders,
    trash: trashedGuides,
    versions: {} as Record<string, Version[]>
  };
  
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

export async function importAllData(jsonData: string) {
  const backup = JSON.parse(jsonData);
  
  // 1. Restore Folders
  const guidesDir = await getGuidesDir();
  if (backup.folders) {
    for (const folder of backup.folders) {
      await guidesDir.getDirectoryHandle(folder.name, { create: true });
    }
  }

  // 2. Restore Guides
  if (backup.guides) {
    for (const guide of backup.guides) {
      const parts = guide.id.split('/');
      const filename = `${parts[parts.length - 1]}.md`;
      
      let currentDir = guidesDir;
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
      }
      
      const fileHandle = await currentDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(guide.content);
      await writable.close();
    }
  }

  // 3. Restore Trash
  if (backup.trash) {
    const trashDir = await getTrashDir();
    for (const item of backup.trash) {
      const filename = `${item.id.split('/').pop()}.md`;
      const folderInfo = item.folder || 'ROOT';
      const trashContent = `<!-- DELETED_AT:${item.deletedAt} FOLDER:${folderInfo} -->\n${item.content}`;
      const trashHandle = await trashDir.getFileHandle(filename, { create: true });
      const writable = await trashHandle.createWritable();
      await writable.write(trashContent);
      await writable.close();
    }
  }

  // 4. Restore Versions
  if (backup.versions) {
    const versionsDir = await getVersionsDir();
    for (const [guideId, versions] of Object.entries(backup.versions)) {
      const cleanId = guideId.replace(/\//g, '_');
      const guideVersionDir = await versionsDir.getDirectoryHandle(cleanId, { create: true });
      
      for (const version of (versions as Version[])) {
        const filename = `${version.timestamp}.md`;
        const fileHandle = await guideVersionDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(version.content);
        await writable.close();
      }
    }
  }
}