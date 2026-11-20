import { lonely } from "./lonely.js";

globalThis.linkChunksEffectRuns = (globalThis.linkChunksEffectRuns || 0) + 1;
export const effect = `${lonely()} effect`;
