"""
Script to package ML model artifacts into an AWS Lambda Layer.

Run this script from the `ml/` directory after training:
    python create_lambda_layer.py

It will:
  1. Create a layer directory structure compatible with AWS Lambda.
  2. Copy model files into python/ml/models/.
  3. Copy feature_engineering.py and predict.py into python/ml/.
  4. Print packaging and upload instructions.
"""

import os
import shutil
import sys

LAYER_ROOT = "lambda_layer"
PACKAGE_DIR = os.path.join(LAYER_ROOT, "python", "ml")
MODELS_DIR = os.path.join(PACKAGE_DIR, "models")

MODEL_FILES = [
    "models/credit_classifier.pkl",
    "models/credit_regressor.pkl",
    "models/feature_names.json",
    "models/feature_importances.json",
]

PYTHON_FILES = [
    "feature_engineering.py",
    "predict.py",
]


def create_layer():
    print("=" * 60)
    print("TnG FinHack — Lambda Layer Packager")
    print("=" * 60)

    # Clean previous build
    if os.path.isdir(LAYER_ROOT):
        shutil.rmtree(LAYER_ROOT)
        print(f"Removed previous {LAYER_ROOT}/")

    os.makedirs(MODELS_DIR, exist_ok=True)

    # Copy model artifacts
    for src in MODEL_FILES:
        if not os.path.isfile(src):
            print(f"ERROR: Missing required file: {src}")
            sys.exit(1)
        dst = os.path.join(MODELS_DIR, os.path.basename(src))
        shutil.copy2(src, dst)
        print(f"Copied {src} -> {dst}")

    # Copy Python modules
    for src in PYTHON_FILES:
        if not os.path.isfile(src):
            print(f"ERROR: Missing required file: {src}")
            sys.exit(1)
        dst = os.path.join(PACKAGE_DIR, os.path.basename(src))
        shutil.copy2(src, dst)
        print(f"Copied {src} -> {dst}")

    # Create __init__.py so it's a proper package
    init_path = os.path.join(PACKAGE_DIR, "__init__.py")
    with open(init_path, "w") as f:
        f.write("# TnG FinHack ML layer\n")
    print(f"Created {init_path}")

    print("\n" + "=" * 60)
    print("Layer structure created successfully!")
    print("=" * 60)
    _print_tree(LAYER_ROOT)
    print("\n" + "=" * 60)
    print("Next steps — package and upload")
    print("=" * 60)
    print(f"""
1. ZIP the layer (run from inside the ml/ folder):

   cd {LAYER_ROOT}
   zip -r ../tng-ml-layer.zip python
   cd ..

   On Windows PowerShell you can use:
   Compress-Archive -Path {LAYER_ROOT}\\python -DestinationPath tng-ml-layer.zip -Force

2. Upload via AWS CLI:

   aws lambda publish-layer-version \\
       --layer-name tng-credit-scoring-ml \\
       --description "TnG FinHack GBM credit classifier & regressor" \\
       --zip-file fileb://tng-ml-layer.zip \\
       --compatible-runtimes python3.11 python3.12 \\
       --region ap-southeast-1

3. Attach the layer to your Lambda function:

   aws lambda update-function-configuration \\
       --function-name tng-credit-scoring \\
       --layers <LayerVersionArnFromStep2> \\
       --region ap-southeast-1

4. (Optional) Set environment variable so handler finds models:

   AWS Lambda layers mount under /opt/.
   The code in predict.py already checks /opt/ml/models first.
""")


def _print_tree(root, prefix=""):
    try:
        entries = sorted(os.listdir(root))
    except OSError:
        return
    for i, entry in enumerate(entries):
        path = os.path.join(root, entry)
        is_last = i == len(entries) - 1
        connector = "└── " if is_last else "├── "
        print(prefix + connector + entry)
        if os.path.isdir(path):
            extension = "    " if is_last else "│   "
            _print_tree(path, prefix + extension)


if __name__ == "__main__":
    create_layer()
