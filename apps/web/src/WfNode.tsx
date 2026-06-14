import { Handle, Position, type NodeProps } from 'reactflow';

export interface WfNodeData {
  label: string;
  type: string;
  group: 'trigger' | 'action' | 'logic';
  isTrigger: boolean;
  outputs: number;
  outputNames?: string[];
  runStatus?: 'success' | 'error' | 'skipped';
}

export function WfNode({ data, selected }: NodeProps<WfNodeData>) {
  const outs = Math.max(1, data.outputs);
  const cls = [
    'wf-node',
    data.group,
    selected ? 'selected' : '',
    data.runStatus ? `run-${data.runStatus}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      {!data.isTrigger && <Handle type="target" position={Position.Left} id="in-0" />}
      <div className="hd">{data.label}</div>
      <div className="ty">{data.type}</div>
      {Array.from({ length: outs }).map((_, i) => {
        const top = ((i + 1) / (outs + 1)) * 100;
        return (
          <Handle
            key={i}
            type="source"
            position={Position.Right}
            id={`out-${i}`}
            style={{ top: `${top}%` }}
          />
        );
      })}
    </div>
  );
}
