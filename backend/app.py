from flask import Flask, request, jsonify
from flask_cors import CORS
from zipfile import ZipFile
from io import BytesIO
import re

app = Flask(__name__)
CORS(app)

saved_zip_bytes = None

def parse_zip_and_extract_imports(buffer):
    with ZipFile(BytesIO(buffer)) as zipfile:
        files = [f for f in zipfile.namelist() if not f.endswith('/')]
        if not files:
            return {"name": "root", "children": []}, []

        root_name = files[0].split('/')[0]
        root = {"name": root_name, "children": []}
        folder_map = {root_name: root}

        for file_path in files:
            parts = file_path.split('/')
            parent = root
            for i, part in enumerate(parts):
                is_file = (i == len(parts) - 1)
                key = '/'.join(parts[:i+1])
                if is_file:
                    node = {"name": part, "children": []}
                    parent.setdefault("children", []).append(node)
                    folder_map[key] = node
                else:
                    found = None
                    for child in parent.get("children", []):
                        if child["name"] == part and isinstance(child.get("children"), list):
                            found = child
                            break
                    if not found:
                        found = {"name": part, "children": []}
                        parent.setdefault("children", []).append(found)
                        folder_map[key] = found
                    parent = found

        import_edges = []
        for file_path in files:
            try:
                with zipfile.open(file_path) as f:
                    content = f.read().decode('utf-8', errors='replace')
            except Exception:
                continue

            imports = set()
            imports.update(re.findall(r'^\s*from\s+([\w\.\/]+)', content, re.MULTILINE))
            imports.update(re.findall(r'^\s*import\s+([\w\.\/]+)', content, re.MULTILINE))
            imports.update(re.findall(r'import\s+.*\s+from\s+[\'"]([\w\.\/\-]+)[\'"]', content))

            for imp in imports:
                for f in files:
                    if f.endswith(imp) or f.split('/')[-1].startswith(imp.split('.')[-1]):
                        import_edges.append({
                            "source": file_path,
                            "target": f,
                            "type": "import"
                        })
                        break

        return root, import_edges

@app.route('/upload', methods=['POST'])
def upload():
    global saved_zip_bytes
    if 'repoZip' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['repoZip']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    try:
        saved_zip_bytes = file.read()
        tree, edges = parse_zip_and_extract_imports(saved_zip_bytes)
        return jsonify({"tree": tree, "edges": edges})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/file-content', methods=['POST'])
def file_content():
    data = request.json
    filepath = data.get('path') or ""

    # Strip the first directory segment from filepath to fix doubled root issues
    parts = filepath.split('/')
    if len(parts) > 1:
        filepath_to_search = '/'.join(parts[1:])
    else:
        filepath_to_search = filepath

    try:
        with ZipFile(BytesIO(saved_zip_bytes)) as zipfile:
            namelist = zipfile.namelist()
            normalized_path = filepath_to_search.lstrip('/').replace('\\', '/')
            matched = None
            for name in namelist:
                if name.lower() == normalized_path.lower() or name.lower().endswith(normalized_path.lower()):
                    matched = name
                    break
            if not matched:
                return jsonify({"error": f"File '{filepath}' not found in ZIP archive."}), 404
            try:
                with zipfile.open(matched) as f:
                    content = f.read().decode('utf-8', errors='replace')
                return jsonify({"content": content})
            except Exception as file_e:
                return jsonify({"error": f"Error reading file '{filepath}': {str(file_e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
