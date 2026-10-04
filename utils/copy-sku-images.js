#!/usr/bin/env node

'use strict';

import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log(`Usage:
  node copy-sku-images.js [json-file] [media-dir] [temp-dir] [--dry-run]

Defaults:
  json-file  artworks-chicago-spectrum.json
  media-dir  media
  temp-dir   temp

Example:
  node copy-sku-images.js artworks-chicago-spectrum.json media temp

The destination filename is prefixed with the numeric portion of the SKU.
An existing leading three-digit prefix is replaced:
  SUE-ART-001 + 010_Koing Around.jpg -> 001_Koing Around.jpg`);
}

const rawArgs = process.argv.slice(2);
if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
  usage();
  process.exit(0);
}

const dryRun = rawArgs.includes('--dry-run');
const args = rawArgs.filter(arg => arg !== '--dry-run');
if (args.length > 3) {
  usage();
  process.exit(2);
}

const jsonFile = path.resolve(args[0] || 'artworks-chicago-spectrum.json');
const mediaDir = path.resolve(args[1] || 'media');
const tempDir = path.resolve(args[2] || 'temp');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(jsonFile)) fail(`JSON file not found: ${jsonFile}`);
if (!fs.existsSync(mediaDir) || !fs.statSync(mediaDir).isDirectory()) {
  fail(`Media directory not found: ${mediaDir}`);
}

let artworks;
try {
  artworks = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
} catch (error) {
  fail(`Cannot parse JSON: ${error.message}`);
}
if (!Array.isArray(artworks)) fail('The JSON root must be an array of artworks');

if (!dryRun) fs.mkdirSync(tempDir, { recursive: true });

const plannedNames = new Set();
const missing = [];
const skipped = [];
let copied = 0;

for (const artwork of artworks) {
  const skuMatch = /^SUE-ART-(\d+)$/i.exec(String(artwork.sku || '').trim());
  if (!skuMatch) {
    skipped.push(`${artwork.sku || '(missing SKU)'}: invalid SKU`);
    continue;
  }

  if (!artwork.referenceImage) {
    skipped.push(`${artwork.sku}: no referenceImage`);
    continue;
  }

  const sourceName = path.basename(String(artwork.referenceImage).trim());
  const extension = path.extname(sourceName).toLowerCase();
  if (extension !== '.jpg' && extension !== '.jpeg') {
    skipped.push(`${artwork.sku}: not a JPG/JPEG (${sourceName})`);
    continue;
  }

  const skuPrefix = skuMatch[1].padStart(3, '0');
  const nameWithoutOldPrefix = sourceName.replace(/^\d{3}[\s_-]+/, '');
  const destinationName = `${skuPrefix}_${nameWithoutOldPrefix}`;
  const sourcePath = path.join(mediaDir, sourceName);
  const destinationPath = path.join(tempDir, destinationName);

  if (plannedNames.has(destinationName.toLowerCase())) {
    fail(`Two artworks produce the same destination filename: ${destinationName}`);
  }
  plannedNames.add(destinationName.toLowerCase());

  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    missing.push(`${artwork.sku}: ${sourcePath}`);
    continue;
  }

  if (dryRun) {
    console.log(`[dry-run] ${sourceName} -> ${destinationName}`);
  } else {
    fs.copyFileSync(sourcePath, destinationPath);
    console.log(`${sourceName} -> ${destinationName}`);
  }
  copied++;
}

console.log(`\n${dryRun ? 'Would copy' : 'Copied'} ${copied} image(s) to ${tempDir}`);

if (skipped.length) {
  console.log(`Skipped ${skipped.length} artwork(s):`);
  for (const item of skipped) console.log(`  - ${item}`);
}

if (missing.length) {
  console.error(`Missing ${missing.length} source image(s):`);
  for (const item of missing) console.error(`  - ${item}`);
  process.exitCode = 1;
}
