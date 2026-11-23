import defer * as deferred from "./deferred.js";
import { b } from "./shared/b.js";
import { publicPath } from "./shared/runtime.js";

export const run = () => [b(), deferred.z(), publicPath()];
