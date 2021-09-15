import * as a1 from "./mem-access.wat?1";
import * as a2 from "./mem-access.wat?2";

a1.set(42);
export const x1 = a1.get();
export const x2 = a2.get();
a2.set(11);
export const y1 = a1.get();
export const y2 = a2.get();
