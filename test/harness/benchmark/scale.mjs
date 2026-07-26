import { getCodspeedRunnerMode } from "@codspeed/core";

// CodSpeed memory mode reports peak net OS-allocator bytes in the window, which is
// quantization-noisy on a sub-MB graph; enlarge only there so simulation/walltime
// benches (already deterministic) stay small and fast.
const MEMORY_MODE = getCodspeedRunnerMode() === "memory";

/**
 * @param {number} normal item/module count for non-memory runner modes
 * @param {number} memory item/module count for CodSpeed memory mode
 * @returns {number} count to generate for the active runner mode
 */
export default function memoryScaledCount(normal, memory) {
	return MEMORY_MODE ? memory : normal;
}
