import { lonely } from "./lonely.js";

globalThis.crossChunkImportsEffectRuns = (globalThis.crossChunkImportsEffectRuns || 0) + 1;
export const effect = `${lonely()} effect`;
