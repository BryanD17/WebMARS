import { useState } from 'react';
import { ControlBar } from './ControlBar';
import { EditorPanel } from './EditorPanel';
import { RegisterPanel } from './RegisterPanel';
import { MemoryPanel } from './MemoryPanel';
import { ConsolePanel } from './ConsolePanel';
import { StatusBar } from './StatusBar';
import { useSimulatorStore } from '../hooks/useSimulator';

const DEFAULT_SOURCE = `# WebMARS — MIPS Simulator
# Edit your MIPS assembly here

.data
msg: .asciiz "Hello, WebMARS!\\n"

.text
main:
    li $v0, 4
    la $a0, msg
    syscall
    li $v0, 10
    syscall
`;

type RightTab = 'registers' | 'memory' | 'console';

export function App() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [rightTab, setRightTab] = useState<RightTab>('registers');
  const setSourceStore = useSimulatorStore(s => s.setSource);

  function handleSourceChange(src: string) {
    setSource(src);
    setSourceStore(src);
  }

  const tabBtn = (label: string, tab: RightTab) => (
    <button
      key={tab}
      onClick={() => setRightTab(tab)}
      className={`px-3 py-1 text-sm font-medium border-b-2 transition-colors ${
        rightTab === tab
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <ControlBar source={source} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col w-3/5 border-r border-gray-300 dark:border-gray-600">
          <EditorPanel source={source} onChange={handleSourceChange} />
        </div>
        <div className="flex flex-col w-2/5 overflow-hidden">
          <div className="flex border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
            {tabBtn('Registers', 'registers')}
            {tabBtn('Memory', 'memory')}
            {tabBtn('Console', 'console')}
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === 'registers' && <RegisterPanel />}
            {rightTab === 'memory' && <MemoryPanel />}
            {rightTab === 'console' && <ConsolePanel />}
          </div>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
