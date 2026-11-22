import { a } from "./shared/a.js";
import * as ns from "./shared/ns.js";

export const run = () => [a(), Object.keys(ns)];
