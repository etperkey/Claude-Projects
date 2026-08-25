import { memo } from 'react';
import BaseNode from './BaseNode';

const DiagnosisNode = memo((props) => <BaseNode {...props} className="node-diagnosis" />);
const WorkupNode = memo((props) => <BaseNode {...props} className="node-workup" />);
const DecisionNode = memo((props) => <BaseNode {...props} className="node-decision" />);
const TreatmentNode = memo((props) => <BaseNode {...props} className="node-treatment" />);
const ResponseNode = memo((props) => <BaseNode {...props} className="node-response" />);
const SurveillanceNode = memo((props) => <BaseNode {...props} className="node-surveillance" />);
const ReferenceNode = memo((props) => <BaseNode {...props} className="node-reference" />);

DiagnosisNode.displayName = 'DiagnosisNode';
WorkupNode.displayName = 'WorkupNode';
DecisionNode.displayName = 'DecisionNode';
TreatmentNode.displayName = 'TreatmentNode';
ResponseNode.displayName = 'ResponseNode';
SurveillanceNode.displayName = 'SurveillanceNode';
ReferenceNode.displayName = 'ReferenceNode';

export const nodeTypes = {
  diagnosis: DiagnosisNode,
  workup: WorkupNode,
  decision: DecisionNode,
  treatment: TreatmentNode,
  response: ResponseNode,
  surveillance: SurveillanceNode,
  reference: ReferenceNode,
};
