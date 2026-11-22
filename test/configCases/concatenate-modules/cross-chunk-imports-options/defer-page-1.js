import defer * as deferred from "./deferred.js";
import { b } from "./shared/b.js";

export const run = () => [b(), deferred.z()];
