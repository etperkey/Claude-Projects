import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGuideline } from '../../context/GuidelineContext';
import { toFlowNodes, toFlowEdges } from '../../utils/graphUtils';
import { nodeTypes } from './nodes';
import PageSelector from './PageSelector';
import NodeDetailPanel from './NodeDetailPanel';

function FlowchartCanvas() {
  const { pageNodes, pageEdges, pages, activePage, setPage, guideline } = useGuideline();
  const [selectedNode, setSelectedNode] = useState(null);
  const { fitView } = useReactFlow();

  const nodes = useMemo(() => toFlowNodes(pageNodes), [pageNodes]);
  const edges = useMemo(() => toFlowEdges(pageEdges), [pageEdges]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.3 }), 150);
    return () => clearTimeout(t);
  }, [nodes, edges, fitView]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.3 }), 200);
    return () => clearTimeout(t);
  }, [selectedNode, fitView]);

  const onNodeClick = useCallback((_event, node) => {
    setSelectedNode(node.data);
  }, []);

  const handleReferenceNavigate = useCallback((targetPage) => {
    setPage(targetPage);
    setSelectedNode(null);
  }, [setPage]);


  return (
    <>
      <PageSelector pages={pages} activePage={activePage} onPageChange={setPage} />
      <div
        style={{
          width: selectedNode ? 'calc(100% - 372px)' : '100%',
          height: 'calc(100vh - 240px)',
          minHeight: '500px',
          transition: 'width 0.2s ease-out',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2.5}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          style={{ width: '100%', height: '100%' }}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls position="bottom-right" />
        </ReactFlow>
      </div>
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          footnotes={guideline?.footnotes}
          references={guideline?.references}
          onClose={() => setSelectedNode(null)}
          onNavigate={handleReferenceNavigate}
        />
      )}
    </>
  );
}

function FlowchartView() {
  return (
    <ReactFlowProvider>
      <FlowchartCanvas />
    </ReactFlowProvider>
  );
}

export default FlowchartView;
