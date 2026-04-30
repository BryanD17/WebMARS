import { useRef, useEffect, useState } from 'react';
import { useSimulatorStore } from '../hooks/useSimulator';

export function ConsolePanel() {
  const consoleOutput = useSimulatorStore(s => s.consoleOutput);
  const inputRequest = useSimulatorStore(s => s.inputRequest);
  const submitInput = useSimulatorStore(s => s.submitInput);
  const [inputVal, setInputVal] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleOutput]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitInput(inputVal);
    setInputVal('');
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="text-xs px-2 py-1 bg-gray-800 text-gray-400">Console</div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-sm text-green-400 whitespace-pre-wrap">
        {consoleOutput}
        <div ref={bottomRef} />
      </div>
      {inputRequest && (
        <form onSubmit={handleSubmit} className="flex gap-2 p-2 bg-gray-800 border-t border-gray-600">
          <span className="text-yellow-400 text-sm font-mono">
            {inputRequest.type === 'int' ? 'Enter integer:' : 'Enter string:'}
          </span>
          <input
            autoFocus
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            className="flex-1 bg-gray-700 text-white font-mono text-sm px-2 rounded border border-gray-500"
          />
          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm">OK</button>
        </form>
      )}
    </div>
  );
}
