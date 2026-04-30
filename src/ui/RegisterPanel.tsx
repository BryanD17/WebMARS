import { useState } from 'react';
import { useSimulatorStore } from '../hooks/useSimulator';
import { REGISTER_NAMES } from '../core/registers';

export function RegisterPanel() {
  const registers = useSimulatorStore(s => s.registers);
  const hi = useSimulatorStore(s => s.hi);
  const lo = useSimulatorStore(s => s.lo);
  const pc = useSimulatorStore(s => s.pc);
  const lastChanged = useSimulatorStore(s => s.lastChangedRegisters);
  const [showHex, setShowHex] = useState(true);

  const fmt = (n: number) => showHex
    ? `0x${(n >>> 0).toString(16).padStart(8, '0')}`
    : String(n | 0);

  const aliases = [
    'zero','at','v0','v1',
    'a0','a1','a2','a3',
    't0','t1','t2','t3','t4','t5','t6','t7',
    's0','s1','s2','s3','s4','s5','s6','s7',
    't8','t9','k0','k1','gp','sp','fp','ra'
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Registers</span>
        <button
          onClick={() => setShowHex(h => !h)}
          className="px-2 py-0.5 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
        >
          {showHex ? 'Dec' : 'Hex'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto text-xs font-mono">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <th className="px-1 py-0.5 text-left">Reg</th>
              <th className="px-1 py-0.5 text-left">Alias</th>
              <th className="px-1 py-0.5 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {registers.map((val, i) => (
              <tr
                key={i}
                className={lastChanged.has(i)
                  ? 'bg-yellow-100 dark:bg-yellow-900'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              >
                <td className="px-1 py-0.5 text-blue-600 dark:text-blue-400">{REGISTER_NAMES[i]}</td>
                <td className="px-1 py-0.5 text-gray-500 dark:text-gray-400">{aliases[i]}</td>
                <td className="px-1 py-0.5 text-right text-green-700 dark:text-green-400">{fmt(val)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-gray-800">
              <td className="px-1 py-0.5 text-purple-600 dark:text-purple-400">PC</td>
              <td className="px-1 py-0.5"></td>
              <td className="px-1 py-0.5 text-right text-purple-700 dark:text-purple-300">{fmt(pc)}</td>
            </tr>
            <tr>
              <td className="px-1 py-0.5 text-orange-600 dark:text-orange-400">HI</td>
              <td className="px-1 py-0.5"></td>
              <td className="px-1 py-0.5 text-right text-orange-700 dark:text-orange-300">{fmt(hi)}</td>
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <td className="px-1 py-0.5 text-orange-600 dark:text-orange-400">LO</td>
              <td className="px-1 py-0.5"></td>
              <td className="px-1 py-0.5 text-right text-orange-700 dark:text-orange-300">{fmt(lo)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
