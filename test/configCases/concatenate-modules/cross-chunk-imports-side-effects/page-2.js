import { a } from "./shared/a.js";
import { b } from "./shared/b.js";
import "./local-2.js";
import { late } from "./shared/late.js";

globalThis.crossChunkEffects.push("page-2");

export const run = () => [a, b, late];
