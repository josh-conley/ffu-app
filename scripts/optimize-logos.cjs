#!/usr/bin/env node

/**
 * Optimize team logos for web
 * - Resize to max 200x200px (maintains aspect ratio)
 * - Compress images
 * - Convert to PNG with optimal compression
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '../public/team-logos');
const MAX_SIZE = 200; // Max width/height in pixels
const QUALITY = 90; // PNG compression quality

async function optimizeLogo(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();

  // Skip if not an image
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    console.log(`⏭️  Skipping non-image: ${fileName}`);
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    const originalSize = stats.size;

    // Read and optimize image
    const image = sharp(filePath);
    const metadata = await image.metadata();

    console.log(`🔧 Processing: ${fileName} (${(originalSize / 1024).toFixed(1)}KB, ${metadata.width}x${metadata.height})`);

    // Resize if needed (maintain aspect ratio)
    let pipeline = image;
    if (metadata.width > MAX_SIZE || metadata.height > MAX_SIZE) {
      pipeline = pipeline.resize(MAX_SIZE, MAX_SIZE, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Optimize based on format
    const outputPath = filePath.replace(ext, '.png');
    await pipeline
      .png({
        quality: QUALITY,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toFile(outputPath + '.tmp');

    // Replace original with optimized version
    await fs.rename(outputPath + '.tmp', outputPath);

    // If original was jpg/jpeg, remove it
    if (ext !== '.png' && filePath !== outputPath) {
      await fs.unlink(filePath);
    }

    const newStats = await fs.stat(outputPath);
    const newSize = newStats.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

    console.log(`✅ Optimized: ${path.basename(outputPath)} (${(newSize / 1024).toFixed(1)}KB, ${savings}% reduction)`);
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message);
  }
}

async function main() {
  console.log('🖼️  Optimizing team logos...\n');

  try {
    const files = await fs.readdir(LOGOS_DIR);
    const imagePaths = files
      .filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(f).toLowerCase()))
      .map(f => path.join(LOGOS_DIR, f));

    console.log(`Found ${imagePaths.length} images to process\n`);

    // Process images sequentially to avoid overwhelming the system
    for (const filePath of imagePaths) {
      await optimizeLogo(filePath);
    }

    console.log('\n✨ All logos optimized!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
