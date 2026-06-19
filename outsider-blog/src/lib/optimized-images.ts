import manifest from '../data/generated/optimized-images.json';

type ImageVariant = 'card' | 'hero' | 'content';

type OptimizedVariant = {
  avif?: string;
  webp?: string;
  width: number;
  height: number;
};

type OptimizedRecord = {
  original: string;
  originalWidth: number;
  originalHeight: number;
  card?: OptimizedVariant;
  hero?: OptimizedVariant;
  content?: OptimizedVariant;
};

const imageManifest = manifest as Record<string, OptimizedRecord>;

export function getOptimizedImage(src: string | undefined, variant: ImageVariant) {
  if (!src) return null;
  return imageManifest[src]?.[variant] ?? null;
}

export function getImageDimensions(src: string | undefined, variant: ImageVariant) {
  const optimized = getOptimizedImage(src, variant);
  if (optimized) return { width: optimized.width, height: optimized.height };
  const original = src ? imageManifest[src] : null;
  if (original) return { width: original.originalWidth, height: original.originalHeight };
  return { width: 1200, height: 630 };
}
