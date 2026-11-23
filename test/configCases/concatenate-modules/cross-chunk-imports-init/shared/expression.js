import { count } from "./declarations.js";
import { deep } from "../deep/deep.js";

globalThis.crossChunkInitEffects.push("expression");

export default `${deep} ${count + 10}`;
