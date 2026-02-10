import type { ImageContent, UploadedFile } from './types';

type FileUploadOptions = {
  fileUploadArea: HTMLElement | null;
  fileInput: HTMLInputElement | null;
  fileListEl: HTMLElement | null;
  contextEl: HTMLTextAreaElement | null;
  promptEl: HTMLTextAreaElement | null;
  cameraBtn?: HTMLElement | null;
  cameraInput?: HTMLInputElement | null;
};

export function initFileUploads({
  fileUploadArea,
  fileInput,
  fileListEl,
  contextEl,
  promptEl,
  cameraBtn,
  cameraInput
}: FileUploadOptions) {
  const uploadedFiles: UploadedFile[] = [];

  if (!fileUploadArea || !fileInput || !fileListEl) {
    return {
      getUploadedFiles: () => uploadedFiles,
      clearFiles: () => {}
    };
  }
  const safeFileListEl = fileListEl;

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function renderFileList() {
    if (uploadedFiles.length === 0) {
      safeFileListEl.innerHTML = '';
      return;
    }

    safeFileListEl.innerHTML = '';

    uploadedFiles.forEach((f, i) => {
      const isImage = f.content && typeof f.content === 'object' && f.content.type === 'image';
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item' + (isImage ? ' has-thumbnail' : '');
      fileItem.title = f.name;

      if (isImage) {
        fileItem.style.cssText = 'position: relative; display: inline-block; width: 96px; height: 96px;';
      }

      if (isImage && typeof f.content === 'object') {
        const imageContent = f.content as ImageContent;
        const img = document.createElement('img');
        img.src = imageContent.base64;
        img.className = 'file-item-thumbnail';
        img.alt = f.name;
        img.style.cssText = 'width: 96px !important; height: 96px !important; max-width: 96px !important; max-height: 96px !important; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb; display: block;';
        fileItem.appendChild(img);
      } else {
        const icon = document.createElement('span');
        icon.className = 'file-item-icon';
        icon.textContent = '📄';
        fileItem.appendChild(icon);

        const name = document.createElement('span');
        name.className = 'file-item-name';
        name.textContent = f.name;
        fileItem.appendChild(name);

        const size = document.createElement('span');
        size.className = 'file-item-size';
        size.textContent = formatSize(f.size);
        fileItem.appendChild(size);
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'file-item-remove';
      removeBtn.dataset.index = String(i);
      removeBtn.title = 'Ta bort';
      removeBtn.textContent = '✕';

      if (isImage) {
        removeBtn.style.cssText = 'position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; background: rgba(0,0,0,0.75); border: 2px solid white; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; z-index: 5;';
      }

      removeBtn.addEventListener('click', () => {
        uploadedFiles.splice(i, 1);
        renderFileList();
      });

      fileItem.appendChild(removeBtn);
      safeFileListEl.appendChild(fileItem);
    });
  }

  async function extractFileContent(file: File) {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('text/') || ['.txt', '.md', '.json', '.js', '.ts', '.py', '.html', '.css'].some(ext => name.endsWith(ext))) {
      return await file.text();
    }

    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      try {
        const pdfjsLib = (globalThis as any).pdfjsLib;
        if (pdfjsLib?.getDocument) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
          return text;
        }
      } catch (error) {
        console.error('PDF parse error:', error);
      }
      return '[PDF kunde inte läsas]';
    }

    if (type.startsWith('image/')) {
      return new Promise<ImageContent | string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve({
            type: 'image',
            base64,
            mimeType: type,
            description: `[Bild: ${file.name} (${formatSize(file.size)})]`
          });
        };
        reader.onerror = () => resolve(`[Bild kunde inte lasas: ${file.name}]`);
        reader.readAsDataURL(file);
      });
    }

    return null;
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    for (const file of list) {
      const content = await extractFileContent(file);
      if (content) {
        uploadedFiles.push({ name: file.name, size: file.size, content });
        renderFileList();
      }
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
          const extension = file.type.split('/')[1] || 'png';
          const namedFile = new File([file], `inklistrad-bild-${timestamp}.${extension}`, { type: file.type });
          handleFiles([namedFile]);
        }
        break;
      }
    }
  }

  fileUploadArea.addEventListener('click', () => fileInput.click());
  fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); fileUploadArea.classList.add('dragover'); });
  fileUploadArea.addEventListener('dragleave', () => fileUploadArea.classList.remove('dragover'));
  fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files) handleFiles(fileInput.files);
  });

  cameraBtn?.addEventListener('click', () => cameraInput?.click());
  cameraInput?.addEventListener('change', () => {
    if (cameraInput.files && cameraInput.files.length > 0) {
      handleFiles(cameraInput.files);
      cameraInput.value = '';
    }
  });

  contextEl?.addEventListener('paste', handlePaste);
  promptEl?.addEventListener('paste', handlePaste);

  return {
    getUploadedFiles: () => uploadedFiles,
    clearFiles: () => { uploadedFiles.length = 0; renderFileList(); }
  };
}
