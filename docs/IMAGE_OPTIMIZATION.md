# Image Optimization Guide for Ocean PULSE

This document outlines best practices for optimizing images and assets in the Ocean PULSE PWA to ensure fast loading times and optimal performance.

## Current Status

✅ **Completed:**
- Dynamic imports for heavy components (Leaflet map)
- PWA icons configured (192x192, 512x512)
- Lazy loading utilities in lib/performance.ts

⚠️ **To Do:**
- Generate all required PWA icon sizes
- Optimize existing icons
- Add species placeholder images
- Add MPA placeholder images

## Required PWA Icon Sizes

The PWA manifest requires multiple icon sizes for different devices and contexts:

```json
{
  "icons": [
    { "src": "/icons/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Image Optimization Best Practices

### 1. Use Next.js Image Component

Always use the Next.js `<Image>` component for optimal performance:

```tsx
import Image from 'next/image';

// Good
<Image
  src="/species/dolphin.jpg"
  alt="Bottlenose Dolphin"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
  blurDataURL="/species/dolphin-blur.jpg"
/>

// Bad
<img src="/species/dolphin.jpg" alt="Bottlenose Dolphin" />
```

### 2. Image Formats

**Recommended formats:**
- **WebP**: Modern format with excellent compression (use as primary)
- **AVIF**: Even better compression (use as fallback with WebP)
- **PNG**: For images requiring transparency
- **JPEG**: Fallback for older browsers

**Example setup:**
```tsx
<picture>
  <source srcSet="/species/dolphin.avif" type="image/avif" />
  <source srcSet="/species/dolphin.webp" type="image/webp" />
  <img src="/species/dolphin.jpg" alt="Bottlenose Dolphin" loading="lazy" />
</picture>
```

### 3. Image Sizing Guidelines

**Species images:**
- Thumbnail: 200x200px (for cards)
- Detail view: 800x600px
- Maximum file size: 100KB

**MPA images:**
- Card view: 400x300px
- Detail header: 1200x600px
- Maximum file size: 150KB

**PWA icons:**
- Follow required sizes above
- Use PNG format
- Transparent background recommended

### 4. Responsive Images

Use srcset for different screen sizes:

```tsx
<Image
  src="/mpa/gbr.jpg"
  alt="Great Barrier Reef"
  width={1200}
  height={600}
  srcSet="
    /mpa/gbr-400.jpg 400w,
    /mpa/gbr-800.jpg 800w,
    /mpa/gbr-1200.jpg 1200w
  "
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 5. Lazy Loading

Use the lazyLoadImage utility from lib/performance.ts:

```tsx
import { lazyLoadImage } from '@/lib/performance';

useEffect(() => {
  const images = document.querySelectorAll('img[data-src]');
  images.forEach((img) => lazyLoadImage(img as HTMLImageElement));
}, []);

// HTML
<img data-src="/species/whale.jpg" alt="Humpback Whale" />
```

### 6. Placeholder Strategies

**Blur placeholders:**
```tsx
<Image
  src="/species/turtle.jpg"
  alt="Sea Turtle"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>
```

**Color placeholders:**
```tsx
<div className="bg-ocean-500 animate-pulse">
  <Image src="/mpa/coral-reef.jpg" alt="Coral Reef" fill />
</div>
```

## Optimization Tools

### Command-line Tools

1. **sharp** (recommended for Node.js):
```bash
npm install sharp
```

```javascript
const sharp = require('sharp');

// Convert to WebP
sharp('input.jpg')
  .webp({ quality: 80 })
  .toFile('output.webp');

// Resize and optimize
sharp('input.jpg')
  .resize(800, 600)
  .jpeg({ quality: 85 })
  .toFile('output.jpg');
```

2. **ImageMagick**:
```bash
# Convert to WebP
convert input.jpg -quality 80 output.webp

# Resize
convert input.jpg -resize 800x600 output.jpg
```

### Online Tools

- **Squoosh**: https://squoosh.app/ (Google's image optimizer)
- **TinyPNG**: https://tinypng.com/ (PNG/JPEG compression)
- **SVGOMG**: https://jakearchibald.github.io/svgomg/ (SVG optimization)

## Implementation Checklist

### Immediate (High Priority)
- [ ] Generate all required PWA icon sizes
- [ ] Optimize existing icon-192x192.png and icon-512x512.png
- [ ] Update manifest.json with all icon sizes
- [ ] Add blur placeholder data URLs for main images

### Short-term
- [ ] Add species placeholder images (15 sample species)
- [ ] Add MPA placeholder images (10 sample MPAs)
- [ ] Implement responsive images for species cards
- [ ] Add WebP format support

### Long-term
- [ ] Set up automated image optimization pipeline
- [ ] Implement AVIF format support
- [ ] Add image CDN integration (Cloudinary, ImageKit)
- [ ] Monitor image performance with analytics

## Performance Targets

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.8s

## Monitoring

Track image performance using the performance utilities:

```typescript
import { reportWebVitals } from '@/lib/performance';

// In app/layout.tsx
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: 'web-vital' | 'custom';
}) {
  // Log metrics
  console.log(metric);

  // Track with analytics
  if (metric.name === 'LCP') {
    trackEvent({
      action: 'largest_contentful_paint',
      category: 'Performance',
      value: Math.round(metric.value),
    });
  }
}
```

## Next Steps

1. **Generate Icons**: Use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator):
   ```bash
   npx pwa-asset-generator logo.svg public/icons --background "#002557" --icon-only
   ```

2. **Optimize Existing Images**: Run through Squoosh or sharp to reduce file sizes

3. **Implement Lazy Loading**: Apply to species and MPA images using IntersectionObserver

4. **Monitor**: Track Core Web Vitals in production to ensure targets are met

## Resources

- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Web.dev Image Optimization](https://web.dev/fast/#optimize-your-images)
- [PWA Image Guidelines](https://web.dev/add-manifest/)
- [Core Web Vitals](https://web.dev/vitals/)
