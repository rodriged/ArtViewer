import fs from "fs";
import path from "path";
import sharp from "sharp";
import { globSync } from "glob";
import { execSync } from "child_process";

/*
CONFIG
*/

const IMAGES_DIR = "./images";
const OUTPUT_DIR = "./targets";

if (!fs.existsSync(OUTPUT_DIR)) {
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/*
FIND ALL JPG/PNG FILES
*/

const files = globSync(`${IMAGES_DIR}/*.{jpg,jpeg,png}`);

if (files.length === 0) {
console.error("No images found.");
process.exit(1);
}

console.log(`Found ${files.length} image(s)`);

/*
NORMALIZE IMAGES
(important for stable tracking)
*/

const tempDir = "./temp-targets";

if (!fs.existsSync(tempDir)) {
fs.mkdirSync(tempDir, { recursive: true });
}

for (const file of files) {

const base = path.basename(file);

const output = path.join(tempDir, base);

console.log(`Processing ${base}`);

await sharp(file)
.resize({
width: 1000,
withoutEnlargement: true
})
.jpeg({
quality: 92
})
.toFile(output);
}

/*
OPEN OFFICIAL COMPILER
*/

console.log("");
console.log("================================================");
console.log("IMPORTANT");
console.log("================================================");
console.log("");
console.log("Open:");
console.log("");
console.log("https://hiukim.github.io/mind-ar-js-doc/tools/compile");
console.log("");
console.log("Then drag ALL files from:");
console.log(tempDir);
console.log("");
console.log("Download targets.mind into:");
console.log(OUTPUT_DIR);
console.log("");
console.log("================================================");

