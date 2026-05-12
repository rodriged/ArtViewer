#!/bin/bash

# Set your target extension
EXT="jpg"
count=0

# Loop through files of that specific type
for file in *."$EXT"; do
    # Skip if no matching files are found
    [ -e "$file" ] || continue
    
    # Prepend the number (e.g., 000_original_name.jpg)
    new_name=$(printf "%03d_%s" "$count" "$file")
    
    # Perform the rename
    mv "$file" "$new_name"
    
    # Increment counter
    ((count++))
done

