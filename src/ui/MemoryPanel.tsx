import { useState } from 'react';
import { useSimulatorStore } from '../hooks/useSimulator';

export function MemoryPanel() {
  const memoryDump = useSimulatorStore(s => s.memoryDump);
  const memoryViewAddr = useSimulatorStore(s => s.memoryViewAddr);
  const setMemoryViewAddr = useSimulatorStore(s => s.setMemoryViewAddr);
  const [inputAddr, setInputAddr] = useState('');

  function handleJump() {
    const addr = parseInt(inputAddr, 16);
    if (!isNaN(addr)) setMemoryViewAddr(addr & ~3);
  }

  function toAscii(word: number): string {
    return [24, 16, 8, 0].map(shift => {
      const b = (word >>> shift) & 0xff;
      return b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
    }).join('');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Memory</span>
        <input
          value={inputAddr}
          onChange={e => setInputAddr(e.target.value)}
          placeholder="0x10010000"
          className="w-28 px-1 rounded border border-gray-300 dark:border-gray-500 dark:bg-gray-600 dark:text-white text-xs"
        />
        <button
          onClick={handleJump}
          className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs"
        >
          Go
        </button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <th className="px-2 py-0.5 text-left">Address</th>
              <th className="px-2 py-0.5 text-left">Word (hex)</th>
              <th className="px-2 py-0.5 text-left">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {memoryDump.map(({ addr, word }) => (
              <tr key={addr} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-2 py-0.5 text-blue-600 dark:text-blue-400">
                  0x{(addr >>> 0).toString(16).padStart(8, '0')}
                </td>
                <td className="px-2 py-0.5 text-green-700 dark:text-green-400">
                  {(word >>> 0).toString(16).padStart(8, '0')}
                </td>
                <td className="px-2 py-0.5 text-gray-500 dark:text-gray-400">
                  {toAscii(word)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
