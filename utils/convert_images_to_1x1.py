import os
from PIL import Image

def convert_images_to_1x1(input_dir, output_dir):
    # Ensure the output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created output directory: {output_dir}")

    # Supported file formats
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff')

    # Iterate through all files in the input folder
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(valid_extensions):
            input_path = os.path.join(input_dir, filename)
            
            # Force the output to be saved as a standard JPEG file format
            base_name, _ = os.path.splitext(filename)
            output_path = os.path.join(output_dir, f"{base_name}_1x1.jpg")
            
            try:
                with Image.open(input_path) as img:
                    # Convert transparency/modes to standard RGB (required for JPEGs)
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                        
                    # Shrink down to 1x1 using a box filter to average out the color spectrum
                    pixel_1x1 = img.resize((64, 64), resample=Image.Resampling.BOX) 
                    # Save the image asset
                    pixel_1x1.save(output_path, "JPEG")
                    print(f"Processed: {filename} -> {base_name}_1x1.jpg")
                    
            except Exception as e:
                print(f"Skipped {filename} due to an error: {e}")

# Configuration Setup
#INPUT_DIRECTORY = "./source_images"
#OUTPUT_DIRECTORY = "./processed_1x1_images"

INPUT_DIRECTORY = '/data/ngn/git/ArtViewer/images'
OUTPUT_DIRECTORY = 'out'

if __name__ == "__main__":
    convert_images_to_1x1(INPUT_DIRECTORY, OUTPUT_DIRECTORY)
