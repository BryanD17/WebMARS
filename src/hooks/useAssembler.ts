import { useSimulatorStore } from './useSimulator';

export function useAssembler() {
  const assemble = useSimulatorStore(s => s.assemble);
  const program = useSimulatorStore(s => s.program);
  const errorMessage = useSimulatorStore(s => s.errorMessage);
  return { assemble, program, errorMessage };
}
