export * as ns from "./shared/ns.js";

// an effect keeps imports from being redirected past this barrel
globalThis.crossChunkReexportBarrel = true;
