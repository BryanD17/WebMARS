import { useSimulatorStore } from '../hooks/useSimulator';

export function StatusBar() {
  const status = useSimulatorStore(s => s.status);
  const pc = useSimulatorStore(s => s.pc);
  const stepCount = useSimulatorStore(s => s.stepCount);
  const program = useSimulatorStore(s => s.program);
  const errorMessage = useSimulatorStore(s => s.errorMessage);

  const currentLine = program?.sourceMap.get(pc) ?? null;

  const statusColor: Record<string, string> = {
    idle: 'text-gray-500',
    assembled: 'text-blue-500',
    running: 'text-green-500',
    paused: 'text-yellow-500',
    halted: 'text-purple-500',
    error: 'text-red-500',
  };

  return (
    <div className="flex items-center gap-4 px-4 py-1 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 text-xs font-mono">
      <span className={statusColor[status] ?? 'text-gray-500'}>
        {status.toUpperCase()}
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        PC: 0x{(pc >>> 0).toString(16).padStart(8, '0')}
      </span>
      {currentLine && (
        <span className="text-gray-600 dark:text-gray-400">Line: {currentLine}</span>
      )}
      <span className="text-gray-600 dark:text-gray-400">Steps: {stepCount}</span>
      {errorMessage && (
        <span className="text-red-500 ml-2 truncate max-w-xl">{errorMessage}</span>
      )}
    </div>
  );
}
