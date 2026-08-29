// Never read: a strict harmony module must still fail to link.
import { missing } from "./exports.js";

export const marker = "strict";
