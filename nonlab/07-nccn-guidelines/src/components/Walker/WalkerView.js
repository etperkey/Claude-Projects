import { useEffect, useRef } from 'react';
import { useGuideline } from '../../context/GuidelineContext';
import { useWalker } from '../../context/WalkerContext';
import { findNode } from '../../utils/graphUtils';
import { buildPathSummary, isPageReference, getNextOptions } from '../../utils/walkerEngine';
import WalkerBreadcrumb from './WalkerBreadcrumb';
import WalkerCurrentStep from './WalkerCurrentStep';
import WalkerSummary from './WalkerSummary';
import WalkerControls from './WalkerControls';
import CaseSummary from './CaseSummary';
import './WalkerView.css';

function WalkerView() {
  const { allNodes, allEdges, guideline, setPage } = useGuideline();
  const walker = useWalker();
  const { currentNodeId, history, started, stopped, start, selectOption, goBack, stop, restart } = walker;

  const startNodes = walker.getStartNodes(allNodes);
  const currentNode = currentNodeId ? findNode(allNodes, currentNodeId) : null;
  const isTerminal = currentNodeId ? walker.isTerminalNode(currentNodeId, allEdges) : false;
  const options = currentNodeId ? getNextOptions(currentNodeId, allNodes, allEdges) : [];
  const pathSummary = buildPathSummary(history, currentNodeId, allNodes);
  const autoAdvancedRef = useRef(new Set());

  // Auto-navigate page references with cycle detection
  useEffect(() => {
    if (currentNode && isPageReference(currentNode)) {
      if (autoAdvancedRef.current.has(currentNodeId)) {
        console.warn('Walker: circular reference detected at node', currentNodeId);
        return;
      }
      autoAdvancedRef.current.add(currentNodeId);
      setPage(currentNode.targetPage);
      const refOptions = getNextOptions(currentNodeId, allNodes, allEdges);
      if (refOptions.length === 1) {
        selectOption(0, refOptions[0].targetNodeId);
      }
    } else {
      // Reset cycle tracking when we land on a non-reference node
      autoAdvancedRef.current.clear();
    }
  }, [currentNodeId, currentNode, allNodes, allEdges, setPage, selectOption]);

  if (!started) {
    return (
      <div className="walker-view">
        <div className="walker-start">
          <h2>Decision Walker</h2>
          <p>Walk through the NCCN algorithm step by step. Select a starting point:</p>
          <div className="walker-start-options">
            {startNodes.map((node) => (
              <button
                key={node.id}
                className="walker-start-btn"
                onClick={() => start(node.id)}
              >
                <span className="walker-start-label">{node.label}</span>
                {node.detail && (
                  <span className="walker-start-detail">{node.detail}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show case summary when stopped or at terminal node
  if (stopped || isTerminal) {
    return (
      <div className="walker-view">
        <WalkerBreadcrumb steps={pathSummary} />
        <CaseSummary
          pathSteps={pathSummary}
          allNodes={allNodes}
          wasStopped={stopped && !isTerminal}
          onRestart={restart}
          guidelineName={guideline?.name}
        />
      </div>
    );
  }

  return (
    <div className="walker-view">
      <WalkerBreadcrumb steps={pathSummary} />
      <div className="walker-main">
        <div className="walker-content">
          {currentNode && (
            <WalkerCurrentStep
              node={currentNode}
              options={options}
              isTerminal={isTerminal}
              onSelect={selectOption}
              footnotes={guideline?.footnotes}
              references={guideline?.references}
            />
          )}
        </div>
        <div className="walker-sidebar">
          <WalkerSummary steps={pathSummary} />
        </div>
      </div>
      <WalkerControls
        canGoBack={history.length > 0}
        onBack={goBack}
        onRestart={restart}
        onStop={stop}
        isTerminal={isTerminal}
      />
    </div>
  );
}

export default WalkerView;
