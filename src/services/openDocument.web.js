import { request } from './api';
export async function openDocument(id) {
  const bytes = await request('GET', `/files/${id}`, undefined, { responseType: 'arraybuffer' });
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url; link.download = `documento-${id}.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
