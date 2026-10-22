// ordinary import, deferred while only `fromOther` is requested
import { x } from "./dep-barrel.js";

export const local = () => x;
