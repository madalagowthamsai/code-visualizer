import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';

// Recursively find node by ID (used for drill-down)
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

// Create nodes and edges for all immediate children of a folder node.
function buildNodesEdgesForFolder(folderNode, parentPathArr = []) {
  const nodes = [];
  const edges = [];
  if (!folderNode || !folderNode.children) return { nodes, edges };
  const parentId =
    parentPathArr.length > 0 ? parentPathArr.join('/') : folderNode.name;

  // Add parent folder node (except at root)
  if (parentPathArr.length > 0) {
    nodes.push({
      id: parentId,
      data: { label: folderNode.name, isFolder: true },
      position: { x: 50, y: 100 },
      style: {
        backgroundColor: '#b2f7ef',
        border: '2px solid #222',
        fontWeight: 'bold'
      }
    });
  }

  // Place children nodes horizontally
  folderNode.children.forEach((child, idx) => {
    const isFolder = !!(child.children && child.children.length > 0);
    const id = [...parentPathArr, child.name].join('/');
    nodes.push({
      id,
      data: { label: child.name, isFolder },
      position: {
        x: 300, // always to the right of parent
        y: 50 + idx * 100
      },
      style: {
        backgroundColor: isFolder ? '#70a1d7' : '#ffe082',
        border: '1.5px solid #111',
        fontWeight: isFolder ? 'bold' : 'normal'
      }
    });
    if (parentPathArr.length > 0) {
      edges.push({
        id: `${parentId}->${id}`,
        source: parentId,
        target: id,
        animated: true
      });
    }
  });

  return { nodes, edges };
}

export default function App() {
  const [treeData, setTreeData] = useState(null);
  const [currentPath, setCurrentPath] = useState([]); // e.g. ['root','folder','subfolder']
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Upload ZIP, receive folder tree JSON
  const uploadZip = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('repoZip', file);
    try {
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setTreeData(data);
        setCurrentPath([data.name]); // e.g. ['root'] or ['Demo-Project']
      } else {
        alert('Failed to upload zip file');
      }
    } catch {
      alert('Error uploading file');
    }
  };

  // Whenever current folder changes, update visible nodes/edges
  useEffect(() => {
    if (!treeData || !currentPath.length) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const folderNode = findNodeByPath(treeData, currentPath);
    const { nodes, edges } = buildNodesEdgesForFolder(folderNode, currentPath);
    setNodes(nodes);
    setEdges(edges);
  }, [treeData, currentPath, setNodes, setEdges]);

  // Double click to drill down into folders with children
  const handleNodeClick = useCallback(
    (event, node) => {
      if (event.detail === 2 && node.data.isFolder) {
        setCurrentPath([...currentPath, node.data.label]);
      }
    },
    [currentPath]
  );

  const goBack = () => {
    if (currentPath.length > 1) setCurrentPath(currentPath.slice(0, -1));
  };

  return (
    <div style={{ height: '100vh', width: '100vw', padding: 20, boxSizing: 'border-box' }}>
      <h1>Repository Folder Drill Down Visualizer</h1>
      <input type="file" accept=".zip" onChange={uploadZip} disabled={!!treeData} />
      {currentPath.length > 1 && (
        <button onClick={goBack} style={{ margin: 10 }}>&larr; Back</button>
      )}
      <div style={{ height: '80%', border: '1px solid #ccc' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
