Run it from the ArtPlay directory:

```bash
node copy-sku-images.js \
  artworks-chicago-spectrum.json \
  media \
  temp
```

Preview without copying:

```bash
node copy-sku-images.js \
  artworks-chicago-spectrum.json \
  media \
  temp \
  --dry-run
```

Example rename:

```text
SUE-ART-001 + 010_Koing Around.jpg
→ temp/001_Koing Around.jpg
```

The script creates `temp/` automatically, copies `.jpg` and `.jpeg` files, replaces existing three-digit prefixes, and reports missing or skipped images.

cd /data/ngn/git/ArtPlay/ap/ArtPlay-CE-v5.2$ 
node ../../../ArtViewer/utils/copy-sku-images.js  data/artworks-chicago-spectrum.json media temp --dry-run
node ../../../ArtViewer/utils/copy-sku-images.js  data/artworks-chicago-spectrum.json media temp 
