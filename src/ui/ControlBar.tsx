import { useEffect } from 'react';
import { useSimulatorStore } from '../hooks/useSimulator';
import { useTheme } from '../hooks/useTheme';

interface Props {
  source: string;
}

export function ControlBar({ source }: Props) {
  const status = useSimulatorStore(s => s.status);
  const assemble = useSimulatorStore(s => s.assemble);
  const step = useSimulatorStore(s => s.step);
  const run = useSimulatorStore(s => s.run);
  const reset = useSimulatorStore(s => s.reset);
  const stop = useSimulatorStore(s => s.stop);
  const { dark, toggle } = useTheme();

  const canAssemble = status !== 'running';
  const canRun = status === 'assembled' || status === 'paused';
  const canStep = status === 'assembled' || status === 'paused';
  const canReset = status !== 'idle' && status !== 'running';
  const canStop = status === 'running';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); if (canAssemble) assemble(source); }
      if (e.key === 'F5') { e.preventDefault(); if (canRun) run(); }
      if (e.key === 'F10') { e.preventDefault(); if (canStep) step(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [source, canAssemble, canRun, canStep, assemble, run, step]);

  const btn = (label: string, action: () => void, enabled: boolean, title: string) => (
    <button
      onClick={action}
      disabled={!enabled}
      title={title}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors
        ${enabled
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
      <span className="font-bold text-lg text-blue-700 dark:text-blue-400 mr-4">WebMARS</span>
      {btn('Assemble', () => assemble(source), canAssemble, 'Assemble (Ctrl+B)')}
      {btn('Run', run, canRun, 'Run (F5)')}
      {btn('Step', step, canStep, 'Step (F10)')}
      {btn('Reset', reset, canReset, 'Reset')}
      {btn('Stop', stop, canStop, 'Stop')}
      <div className="ml-auto">
        <button
          onClick={toggle}
          className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 dark:text-white"
        >
          {dark ? 'Light' : 'Dark'} Mode
        </button>
      </div>
    </div>
  );
}
