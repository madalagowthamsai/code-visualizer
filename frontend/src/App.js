import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

function findNodeByPath(node, pathArr) {
  if (!node || !pathArr.length) return null;
  if (pathArr[0] !== node.name) return null;
  if (pathArr.length === 1) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findNodeByPath(child, pathArr.slice(1));
    if (found) return found;
  }
  return null;
}

function buildNodesEdges(folderNode, currentPath, importEdges) {
  const nodes = [];
  const edges = [];

  if (!folderNode || !folderNode.children) return { nodes, edges };

  const parentId = currentPath.join('/');

  // Parent folder node (except top/root)
  if (currentPath.length > 1) {
    nodes.push({
      id: parentId,
      data: { label: folderNode.name, isFolder: true },
      position: { x: 50, y: 100 },
      style: {
        backgroundColor: '#b2f7ef',
        border: '2px solid #222',
        fontWeight: 'bold',
        cursor: 'pointer',
      },
    });
  }

  folderNode.children.forEach((child, idx) => {
    const isFolder = child.children && child.children.length > 0;
    const nodeId = [...currentPath, child.name].join('/');
    nodes.push({
      id: nodeId,
      data: { label: child.name, isFolder },
      position: { x: 300, y: 50 + idx * 100 },
      style: {
        backgroundColor: isFolder ? '#70a1d7' : '#ffe082',
        border: '1.5px solid #111',
        fontWeight: isFolder ? 'bold' : 'normal',
        cursor: 'pointer',
      },
    });
    if (currentPath.length > 1) {
      edges.push({
        id: `containment-${parentId}->${nodeId}`,
        source: parentId,
        target: nodeId,
        animated: true,
        style: { stroke: '#888' },
      });
    }
  });

  // Filter importEdges relevant for nodes visible in this folder
  const visibleIds = new Set(nodes.map((n) => n.id));
  importEdges.forEach((edge, i) => {
    // Normalize edge source/target paths to id format (assuming '/' separator)
    const sourceId = edge.source;
    const targetId = edge.target;
    if (visibleIds.has(sourceId) && visibleIds.has(targetId)) {
      edges.push({
        id: `import-${i}`,
        source: sourceId,
        target: targetId,
        animated: true,
        style: { stroke: 'red', strokeWidth: 2 },
        label: 'import',
      });
    }
  });

  return { nodes, edges };
}

export default function App() {
  const [treeData, setTreeData] = useState(null);
  const [importEdges, setImportEdges] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [fileContent, setFileContent] = useState('');
  const [showFileContent, setShowFileContent] = useState(false);
  const [fileName, setFileName] = useState('');

  const uploadZip = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('repoZip', file);
    try {
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        const { tree, edges } = await res.json();
        setTreeData(tree);
        setImportEdges(edges);
        setCurrentPath([tree.name]);
        setFileContent('');
        setShowFileContent(false);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      alert('Upload error');
    }
  };

  useEffect(() => {
    if (!treeData || !currentPath.length) {
      setNodes([]);
      setEdges([]);
      setFileContent('');
      setShowFileContent(false);
      return;
    }
    const folder = findNodeByPath(treeData, currentPath);
    if (!folder) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const data = buildNodesEdges(folder, currentPath, importEdges);
    setNodes(data.nodes);
    setEdges(data.edges);
  }, [treeData, currentPath, importEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    async (event, node) => {
      if (event.detail === 2) {
        if (!node.data.isFolder) {
          // File double-click: load content
          setFileName(node.id);
          try {
            const res = await fetch('http://localhost:5000/file-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: node.id }),
            });
            const json = await res.json();
            if (json.content) {
              setFileContent(json.content);
              setShowFileContent(true);
            } else {
              setFileContent('Unable to load file content.');
              setShowFileContent(true);
            }
          } catch {
            setFileContent('Error loading file content.');
            setShowFileContent(true);
          }
        } else {
          // Folder double-click: drill down
          setCurrentPath([...currentPath, node.data.label]);
          setShowFileContent(false);
          setFileContent('');
        }
      }
    },
    [currentPath]
  );

  const goBack = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
      setShowFileContent(false);
      setFileContent('');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 10 }}>
      <h1>Code Repo Visualizer with Import Relations</h1>
      <input type="file" accept=".zip" onChange={uploadZip} disabled={!!treeData} />
      {currentPath.length > 1 && (
        <button onClick={goBack} style={{ margin: '10px' }}>
          &larr; Back
        </button>
      )}
      <div style={{ flex: 1, display: 'flex', border: '1px solid #ccc' }}>
        <div style={{ width: showFileContent ? '60%' : '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
        {showFileContent && (
          <pre
            style={{
              width: '40%',
              height: '100%',
              margin: 0,
              padding: 20,
              overflow: 'auto',
              backgroundColor: '#f4f4f4',
              borderLeft: '1px solid #ccc',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            <strong>{fileName}</strong>
            <br />
            {fileContent}
          </pre>
        )}
      </div>
    </div>
  );
}
