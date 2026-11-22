import "./shared/a.js";
import { b } from "./shared/b.js";
import { load } from "flagged";
import "./local-1.js";
import { late } from "./shared/late.js";

globalThis.crossChunkEffects.push("page-1");

export const run = () => [b, late, load()];
