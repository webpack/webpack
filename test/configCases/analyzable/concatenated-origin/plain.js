import { double } from "./helper";

export const load = () => import("./plain-lazy");
export const n = double(21);
