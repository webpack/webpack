import * as json from "./data.json" with { type: "json" };
import * as text from "./note.txt" with { type: "text" };
import * as cjs from "./cjs.js";

export const seenElsewhere = { json, text, cjs };
