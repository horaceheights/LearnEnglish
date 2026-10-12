import { Asset } from 'expo-asset';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import type { ImageURISource } from 'react-native';

import packIndex from './generated/bundled-image-packs.json';
import { LESSON_IMAGE_PACKS } from './lessonImagePacks';

type PackedImage = { pack: string; offset: number; size: number; width: number; height: number; sha256: string; md5: string };
const images: Record<string, PackedImage> = packIndex.images;
const packs: Record<string, { size: number }> = packIndex.packs;
const localPacks = new Map<string, string>();
const checkedFiles = new Map<string, number | null>();
const cacheDirectory = new Directory(Paths.cache, 'spanglish-packed-images-v1');
let preparation: Promise<void> | null = null;

export function preparePackedLessonImages(): Promise<void> {
  if (preparation) return preparation;
  preparation = (async () => {
    const keys = Object.keys(LESSON_IMAGE_PACKS);
    let next = 0;
    // Expo Updates has already installed every pack before launching the bundle.
    // downloadAsync is a no-op for those local assets; it also supports Metro
    // development and copies embedded Android resources to readable local files.
    const worker = async () => {
      while (next < keys.length) {
        const key = keys[next++];
        const asset = await Asset.fromModule(LESSON_IMAGE_PACKS[key]).downloadAsync();
        if (!asset.localUri || !asset.localUri.startsWith('file://')) {
          throw new Error('No se pudieron preparar las imágenes.');
        }
        const file = new File(asset.localUri);
        if (!file.exists || file.size !== packs[key].size) {
          throw new Error('No se pudieron preparar las imágenes.');
        }
        localPacks.set(key, file.uri);
      }
    };
    const outcomes = await Promise.allSettled(Array.from({ length: Math.min(4, keys.length) }, worker));
    const failed = outcomes.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  })().catch(error => {
    preparation = null;
    throw error;
  });
  return preparation;
}

export function packedLessonImageSource(filename: string): ImageURISource | null {
  const entry = images[filename];
  if (!entry) return null;
  const destination = new File(cacheDirectory, `${entry.sha256}.webp`);
  // Recheck existence and timestamp so an OS-purged or damaged cache repairs
  // itself from the installed pack, including in airplane mode.
  const valid = destination.exists && destination.size === entry.size &&
    (checkedFiles.has(entry.sha256) && checkedFiles.get(entry.sha256) === destination.lastModified ||
      destination.md5 === entry.md5);
  if (!valid) {
    const packUri = localPacks.get(entry.pack);
    if (!packUri) throw new Error('Espera mientras se preparan las imágenes.');
    cacheDirectory.create({ idempotent: true, intermediates: true });
    const partial = new File(cacheDirectory, `${entry.sha256}.partial`);
    const handle = new File(packUri).open(FileMode.ReadOnly);
    try {
      handle.offset = entry.offset;
      const bytes = handle.readBytes(entry.size);
      if (bytes.length !== entry.size) throw new Error('No se pudo leer la imagen.');
      partial.write(bytes);
      if (partial.size !== entry.size || partial.md5 !== entry.md5) {
        throw new Error('No se pudo verificar la imagen.');
      }
      partial.moveSync(destination, { overwrite: true });
    } finally {
      handle.close();
      // moveSync updates the File object's URI to the destination.
      const leftover = new File(cacheDirectory, `${entry.sha256}.partial`);
      if (leftover.exists) leftover.delete();
    }
  }
  checkedFiles.set(entry.sha256, destination.lastModified);
  // Retain dimensions: the existing 3:2 framing rule depends on this metadata.
  return { uri: destination.uri, width: entry.width, height: entry.height, scale: 1 };
}
