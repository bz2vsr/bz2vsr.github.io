import subprocess
import shutil
import os

def run_script(script_path):
    """Run a Python script."""
    try:
        subprocess.run(['python', script_path], check=True)
        print(f"Successfully ran {script_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error running {script_path}: {e}")

def main():
    # Define the base path for the scripts
    base_path = os.path.dirname(os.path.abspath(__file__))

    # Step 1: Run combine.py
    combine_script = os.path.join(base_path, '0-combine', 'combine.py')
    run_script(combine_script)

    # Step 2: Copy All-ODF-Data.json to 1-merge src folder
    all_odf_data_path = os.path.join(base_path, '0-combine', 'All-ODF-Data.json')
    merge_src_path = os.path.join(base_path, '1-merge', 'src', 'All-ODF-Data.json')
    shutil.copy(all_odf_data_path, merge_src_path)
    print(f"Copied {all_odf_data_path} to {merge_src_path}")

    # Step 3: Run merge.py
    merge_script = os.path.join(base_path, '1-merge', 'merge.py')
    run_script(merge_script)

    # Step 4: Copy Divine_ODF_Merge.json to 2-categorize src folder
    divine_odf_merge_path = os.path.join(base_path, '1-merge', 'Divine_ODF_Merge.json')
    categorize_src_path = os.path.join(base_path, '2-categorize', 'src', 'Divine_ODF_Merge.json')
    shutil.copy(divine_odf_merge_path, categorize_src_path)
    print(f"Copied {divine_odf_merge_path} to {categorize_src_path}")

    # Step 5: Run categorize.py
    categorize_script = os.path.join(base_path, '2-categorize', 'categorize.py')
    run_script(categorize_script)

if __name__ == "__main__":
    main()