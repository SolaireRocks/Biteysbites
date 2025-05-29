import os
import sys

def merge_files_in_directory():
    # Get the current working directory
    current_directory_path = os.getcwd()
    # Get the base name of the current directory (the folder name)
    folder_name = os.path.basename(current_directory_path)
    
    # Construct the output filename
    output_filename = f"{folder_name}_merged.txt"
    
    # Get the name of the script itself to avoid merging it
    try:
        current_script_name = os.path.basename(sys.argv[0])
    except IndexError: # Should not happen if run as script, but good for robustness
        current_script_name = "merge_files.py" # Fallback, or whatever you name the script

    files_to_merge = []
    print(f"Scanning directory: {current_directory_path}")
    print(f"Output file will be: {output_filename}")

    # List all items in the current directory
    for item in os.listdir("."): # "." refers to the current directory
        # Check if it's a file (not a directory)
        if os.path.isfile(item):
            # Exclude the script itself and the dynamic output file
            if item.lower() != current_script_name.lower() and item.lower() != output_filename.lower():
                files_to_merge.append(item)

    if not files_to_merge:
        print("No files found to merge (excluding this script and the potential output file).")
        return

    print(f"\nFound {len(files_to_merge)} files to merge:")
    for f_name in files_to_merge:
        print(f"  - {f_name}")

    with open(output_filename, "w", encoding="utf-8") as outfile:
        for filename in files_to_merge:
            separator_start = f"--- Start of: {filename} ---\n"
            separator_end = f"\n--- End of: {filename} ---\n\n" # Two newlines for better separation
            
            print(f"Merging: {filename}...")
            outfile.write(separator_start)
            try:
                with open(filename, "r", encoding="utf-8", errors="ignore") as infile:
                    content = infile.read()
                    outfile.write(content)
                    # Ensure a newline before the end separator if the file didn't end with one
                    if content and not content.endswith('\n'):
                        outfile.write('\n')
            except Exception as e:
                error_message = f"Could not read file {filename}: {e}\n"
                print(error_message)
                outfile.write(f"*** ERROR reading {filename}: {e} ***\n")
            
            # lstrip on separator_end to avoid triple newline if content already ended with \n
            # and we added one, then separator_end also starts with one.
            # However, a simpler way is to ensure separator_end itself doesn't start with \n
            # if we've already conditionally added one.
            # Let's refine the separator_end handling slightly.
            
            # Original separator_end: f"\n--- End of: {filename} ---\n\n"
            # If content didn't end with \n, we add one. Then separator_end adds another, then two more.
            # It's better to manage newlines explicitly.
            
            outfile.write(f"--- End of: {filename} ---\n\n") # Keep it simple, ensure one newline from content, then two from here.

    print(f"\nSuccessfully merged {len(files_to_merge)} files into {output_filename}")

if __name__ == "__main__":
    merge_files_in_directory()