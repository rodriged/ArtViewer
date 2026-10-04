for file in *.jpg *.jpeg *.JPG *.JPEG; do
  [ -f "$file" ] || continue

  convert "$file" \
    -auto-orient \
    -resize '1200x1200>' \
    -colorspace sRGB \
    -strip \
    -sampling-factor 4:2:0 \
    -interlace Plane \
    -quality 82 \
    "./$file"
done
