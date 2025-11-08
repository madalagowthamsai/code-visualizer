import React from 'react';

const FolderBox = ({ node, onDoubleClick }) => {
  const isFolder = node.children && node.children.length > 0;
  return (
    <div
      className={`folder-box ${isFolder ? 'folder' : 'file'}`}
      onDoubleClick={() => isFolder && onDoubleClick(node)}
      title={node.name}
    >
      {node.name}
    </div>
  );
};

export default FolderBox;
