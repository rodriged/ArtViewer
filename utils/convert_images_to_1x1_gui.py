import os
import sys
import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image

def process_images(input_dir, output_dir):
    """Core image processing engine."""
    if not input_dir or not output_dir:
        messagebox.showerror("Error", "Please select both input and output directories.")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff')
    
    try:
        files = os.listdir(input_dir)
    except Exception as e:
        messagebox.showerror("Error", f"Could not read input directory:\n{e}")
        return

    image_files = [f for f in files if f.lower().endswith(valid_extensions)]
    
    if not image_files:
        messagebox.showinfo("No Images Found", f"No supported images found in:\n{input_dir}")
        return

    success_count = 0
    error_count = 0

    for filename in image_files:
        input_path = os.path.join(input_dir, filename)
        base_name, _ = os.path.splitext(filename)
        output_path = os.path.join(output_dir, f"{base_name}_1x1.jpg")
        
        try:
            with Image.open(input_path) as img:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                    
                pixel_1x1 = img.resize((64, 64), resample=Image.Resampling.BOX) 
                pixel_1x1.save(output_path, "JPEG")
                success_count += 1
                
        except Exception:
            error_count += 1

    messagebox.showinfo(
        "Processing Complete", 
        f"Successfully converted: {success_count} images.\nFailed/Skipped: {error_count} files."
    )

def run_gui():
    """Builds and launches the visual user interface window."""
    root = tk.Tk()
    root.title("Image to 1x1 Converter")
    root.geometry("500x250")
    root.resizable(False, False)

    input_path_var = tk.StringVar()
    output_path_var = tk.StringVar()

    def select_input():
        path = filedialog.askdirectory(title="Select Input Folder Containing Images")
        if path:
            input_path_var.set(os.path.normpath(path))

    def select_output():
        path = filedialog.askdirectory(title="Select Output Folder for 1x1 JPEGs")
        if path:
            output_path_var.set(os.path.normpath(path))

    # --- Layout Widgets (All Parameters Verified) ---
    # Input Selection UI
    tk.Label(root, text="Source Image Folder:", font=("Arial", 10, "bold")).pack(anchor="w", padx=20, pady=(20, 2))
    input_frame = tk.Frame(root)
    input_frame.pack(fill="x", padx=20)
    tk.Entry(input_frame, textvariable=input_path_var, width=45).pack(side="left", fill="x", expand=True, padx=(0, 5))
    tk.Button(input_frame, text="Browse...", command=select_input, width=10).pack(side="right")

    # Output Selection UI
    tk.Label(root, text="Destination Folder:", font=("Arial", 10, "bold")).pack(anchor="w", padx=20, pady=(15, 2))
    output_frame = tk.Frame(root)
    output_frame.pack(fill="x", padx=20)
    tk.Entry(output_frame, textvariable=output_path_var, width=45).pack(side="left", fill="x", expand=True, padx=(0, 5))
    tk.Button(output_frame, text="Browse...", command=select_output, width=10).pack(side="right")

    # Action Trigger Button
    tk.Button(
        root, 
        text="CONVERT IMAGES", 
        font=("Arial", 11, "bold"), 
        bg="#4CAF50", 
        fg="white", 
        activebackground="#45a049",
        activeforeground="white",
        command=lambda: process_images(input_path_var.get(), output_path_var.get()),
        height=2
    ).pack(fill="x", padx=40, pady=30)

    root.mainloop()

if __name__ == "__main__":
    run_gui()

