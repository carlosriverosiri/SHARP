type ImageFilePayload = {
  name: string;
  base64: string;
  mimeType: string;
};

type UploadedFileLike = {
  name: string;
  content?: string | { type?: string; base64?: string; mimeType?: string; description?: string };
};

export function buildFilePayload(files: UploadedFileLike[]) {
  const textFiles: string[] = [];
  const imageFiles: ImageFilePayload[] = [];

  files.forEach((file) => {
    const content = file.content;
    if (content && typeof content === 'object' && content.type === 'image') {
      imageFiles.push({
        name: file.name,
        base64: content.base64 || '',
        mimeType: content.mimeType || ''
      });
      return;
    }

    const contentText = typeof content === 'string' ? content : content?.description || '';
    textFiles.push('### ' + file.name + '\n' + contentText);
  });

  return {
    fileContent: textFiles.join('\n\n---\n\n'),
    imageFiles
  };
}
