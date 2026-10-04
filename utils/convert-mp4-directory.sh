#!/usr/bin/env bash

# ./convert-mp4-directory.sh ./media ./converted
# ./convert-mp4-directory.sh ./media
# This creates ./media/out

#The script:
#- Processes .mp4 files case-insensitively
#- Handles spaces in filenames
#- Preserves original filenames
#- Creates the output directory automatically
#- Uses H.264, CRF 24, slow preset, 480-pixel width and fast-start
#- Preserves aspect ratio and ensures an even output height
#- Skips existing output files
#- Removes incomplete output if conversion fails
#- Prints converted, skipped and failed totals
#It processes only MP4 files directly inside the input directory, not nested subdirectories.

set -uo pipefail

input_dir="${1:-.}"
output_dir="${2:-$input_dir/out}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg is not installed or is not in PATH." >&2
  exit 1
fi

if [[ ! -d "$input_dir" ]]; then
  echo "Error: input directory does not exist: $input_dir" >&2
  exit 1
fi

mkdir -p "$output_dir"

input_dir_abs="$(cd "$input_dir" && pwd -P)"
output_dir_abs="$(cd "$output_dir" && pwd -P)"
converted=0
skipped=0
failed=0
found=0

while IFS= read -r -d '' input_file; do
  found=$((found + 1))
  filename="$(basename "$input_file")"
  output_file="$output_dir_abs/$filename"

  if [[ "$(cd "$(dirname "$input_file")" && pwd -P)/$filename" == "$output_file" ]]; then
    echo "Skipping input that is already in the output directory: $filename"
    skipped=$((skipped + 1))
    continue
  fi

  if [[ -e "$output_file" ]]; then
    echo "Skipping existing output: $output_file"
    skipped=$((skipped + 1))
    continue
  fi

  echo "Converting: $filename"
  if ffmpeg -hide_banner -i "$input_file" \
      -vcodec libx264 \
      -crf 24 \
      -preset slow \
      -vf "scale=480:-2" \
      -movflags +faststart \
      "$output_file"; then
    converted=$((converted + 1))
  else
    echo "Failed: $filename" >&2
    rm -f "$output_file"
    failed=$((failed + 1))
  fi
done < <(find "$input_dir_abs" -maxdepth 1 -type f -iname '*.mp4' -print0)

if (( found == 0 )); then
  echo "No MP4 files found in: $input_dir_abs"
  exit 0
fi

echo
echo "Finished."
echo "Converted: $converted"
echo "Skipped:   $skipped"
echo "Failed:    $failed"
echo "Output:    $output_dir_abs"

(( failed == 0 ))
