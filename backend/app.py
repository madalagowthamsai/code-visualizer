from flask import Flask, request, jsonify
from flask_cors import CORS
from zipfile import ZipFile
from io import BytesIO
import re

app = Flask(__name__)
CORS(app)

saved_zip_bytes = None

def parse_zip_folder_structure_and_imports(buffer):
    with ZipFile(BytesIO(buffer)) as zipfile:
        files = [f for f in zipfile.namelist() if not f.endswith('/')]
        root_name = files[0].split('/')[0] if files else "root"
        root = {"name": root_name, "children": []}
        folder_map = {root_name: root}

        # Build folder/file hierarchy
        for file_path in files:
            parts = file_path.split('/')
            parent = root
            for i, part in enumerate(parts):
                key = '/'.join(parts[:i+1])
                is_file = (i == len(parts) - 1)
                if is_file:
                    node = {"name": part, "children": []}
                    if "children" not in parent: parent["children"] = []
                    parent["children"].append(node)
                    folder_map[key] = node
                else:
                    if "children" not in parent: parent["children"] = []
                    found = None
                    for child in parent["children"]:
                        if child["name"] == part and child.get("children") is not None:
                            found = child
                            break
                    if not found:
                        found = {"name": part, "children": []}
                        parent["children"].append(found)
                        folder_map[key] = found
                    parent = found

        # Build import dependency edges
        dep_edges = []
        for file_path in files:
            try:
                with zipfile.open(file_path) as f:
                    content = f.read().decode('utf-8', errors='replace')
            except:
                continue
            imports = []
            # Python imports: import x or from x import y
            py_imports = re.findall(r'^\s*(?:from|import)\s+([\w\.\/]+)', content, re.MULTILINE)
            imports.extend(py_imports)

            # JS imports: import ... from 'x'
            js_imports = re.findall(r'import .* from [\'"]([^\'"]+)[\'"]', content)
            imports.extend(js_imports)

            # For each import, try to resolve to file path in zip
            for imp in imports:
                # If relative import, build edge if exists
                for other_file in files:
                    if other_file.endswith(imp) or other_file.split('/')[-1] == imp or imp in other_file:
                        dep_edges.append({
                            "source": file_path,
                            "target": other_file,
                            "type": "import"
                        })
                        break

        return root, dep_edges

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
        structure, edges = parse_zip_folder_structure_and_imports(saved_zip_bytes)
        return jsonify({"tree": structure, "edges": edges})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/file-content', methods=['POST'])
def file_content():
    data = request.json
    filepath = data.get('path')
    try:
        with ZipFile(BytesIO(saved_zip_bytes)) as zipfile:
            with zipfile.open(filepath) as f:
                content = f.read().decode('utf-8', errors='replace')
        return jsonify({"content": content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
