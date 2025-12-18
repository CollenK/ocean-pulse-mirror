# App Icons

## Status: Placeholder Icons Needed

The SVG icon has been created (`icon.svg`), but we need to generate PNG files for all sizes.

## Required Sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

## How to Generate:

### Option 1: Using Online Tool
1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload `icon.svg`
3. Generate all sizes
4. Download and place in this directory

### Option 2: Using ImageMagick (command line)
```bash
brew install imagemagick  # macOS

for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

### Option 3: Manual Design
Create custom PNG files for each size in a design tool (Figma, Sketch, etc.)

## For MVP:
The app will use the SVG or create simple placeholder PNGs for testing purposes.
