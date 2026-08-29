// Never read, so nothing else in the build resolves this specifier.
import { missing } from "./exports.js";

export const marker = "unused-missing";
