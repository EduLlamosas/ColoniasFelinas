import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { deleteUploadedFile, UPLOADS_DIR } from './uploaded-file.util.js';

vi.mock('node:fs/promises', () => ({ unlink: vi.fn().mockResolvedValue(undefined) }));

describe('deleteUploadedFile', () => {
  beforeEach(() => {
    vi.mocked(unlink).mockClear();
    vi.mocked(unlink).mockResolvedValue(undefined);
  });

  it('no hace nada si la url es null/undefined', async () => {
    await deleteUploadedFile(null);
    await deleteUploadedFile(undefined);
    expect(unlink).not.toHaveBeenCalled();
  });

  it('borra el fichero correspondiente al nombre en la url', async () => {
    await deleteUploadedFile('http://localhost:3000/uploads/abc-123.webp');
    expect(unlink).toHaveBeenCalledWith(join(UPLOADS_DIR, 'abc-123.webp'));
  });

  it('funciona igual con cualquier host (el que tuviera guardado APP_URL en su momento)', async () => {
    await deleteUploadedFile('https://otro-host.example/uploads/xyz.webp');
    expect(unlink).toHaveBeenCalledWith(join(UPLOADS_DIR, 'xyz.webp'));
  });

  it('ignora urls que no apuntan a /uploads/ (p.ej. las de ejemplo del seed)', async () => {
    await deleteUploadedFile('https://example.com/cesiones/ana-torres.pdf');
    expect(unlink).not.toHaveBeenCalled();
  });

  it('no revienta si el borrado falla (fichero ya no existe)', async () => {
    vi.mocked(unlink).mockRejectedValueOnce(new Error('ENOENT'));
    await expect(deleteUploadedFile('http://x/uploads/no-existe.webp')).resolves.toBeUndefined();
  });
});
