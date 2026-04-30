import Editor, { Monaco } from '@monaco-editor/react';
import { useSimulatorStore } from '../hooks/useSimulator';
import { useTheme } from '../hooks/useTheme';
import type * as monacoType from 'monaco-editor';

interface Props {
  source: string;
  onChange: (src: string) => void;
}

function registerMipsLanguage(monaco: Monaco) {
  monaco.languages.register({ id: 'mips' });
  monaco.languages.setMonarchTokensProvider('mips', {
    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [/\.[a-zA-Z]+/, 'keyword.directive'],
        [/\$\w+/, 'variable.register'],
        [/[a-zA-Z_]\w*:/, 'type.label'],
        [/\b(add|addu|sub|subu|and|or|xor|nor|slt|sltu|sll|srl|sra|sllv|srlv|srav|mult|multu|div|divu|mfhi|mflo|mthi|mtlo|jr|jalr|syscall|addi|addiu|andi|ori|xori|slti|sltiu|lui|lw|sw|lh|lhu|sh|lb|lbu|sb|beq|bne|bgtz|blez|bltz|bgez|j|jal|move|li|la|nop)\b/, 'keyword'],
        [/"[^"]*"/, 'string'],
        [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
        [/-?\b\d+\b/, 'number'],
        [/[a-zA-Z_]\w*/, 'identifier'],
      ],
    },
  });
  monaco.editor.defineTheme('mips-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569cd6' },
      { token: 'keyword.directive', foreground: 'c586c0' },
      { token: 'variable.register', foreground: '4ec9b0' },
      { token: 'type.label', foreground: 'dcdcaa' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'number.hex', foreground: 'b5cea8' },
    ],
    colors: {},
  });
  monaco.editor.defineTheme('mips-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0000ff' },
      { token: 'keyword.directive', foreground: '800080' },
      { token: 'variable.register', foreground: '008080' },
      { token: 'type.label', foreground: '795e26' },
      { token: 'string', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'number.hex', foreground: '098658' },
    ],
    colors: {},
  });
}

export function EditorPanel({ source, onChange }: Props) {
  const { dark } = useTheme();
  const pc = useSimulatorStore(s => s.pc);
  const program = useSimulatorStore(s => s.program);
  const status = useSimulatorStore(s => s.status);

  const currentLine = program?.sourceMap.get(pc) ?? null;

  function handleMount(editor: monacoType.editor.IStandaloneCodeEditor, monaco: Monaco) {
    registerMipsLanguage(monaco);
    monaco.editor.setTheme(dark ? 'mips-dark' : 'mips-light');

    // Highlight current PC line
    if (currentLine) {
      editor.deltaDecorations([], [{
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: { isWholeLine: true, className: 'pc-line-highlight' },
      }]);
    }

    // Show assembler errors
    if (program?.errors.length) {
      const markers = program.errors.map(e => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: e.line,
        startColumn: 1,
        endLineNumber: e.line,
        endColumn: 100,
        message: e.message,
      }));
      const model = editor.getModel();
      if (model) monaco.editor.setModelMarkers(model, 'mips', markers);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
        Editor {status !== 'idle' && `— Status: ${status}`}
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language="mips"
          theme={dark ? 'mips-dark' : 'mips-light'}
          value={source}
          onChange={(val) => onChange(val ?? '')}
          onMount={handleMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'off',
          }}
        />
      </div>
      <style>{`.pc-line-highlight { background: rgba(255,215,0,0.2); }`}</style>
    </div>
  );
}
