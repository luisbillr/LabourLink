import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { request } from './api';

export async function openDocument(id) {
  const bytes = await request('GET', `/files/${id}`, undefined, { responseType: 'arraybuffer' });
  const file = new File(Paths.cache, `toreparo-${id}.pdf`);
  try {
    file.create({ overwrite: true });
    await file.write(new Uint8Array(bytes));
    if (!await Sharing.isAvailableAsync()) throw new Error('No hay una aplicación disponible para abrir este documento.');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } finally { if (file.exists) file.delete(); }
}
