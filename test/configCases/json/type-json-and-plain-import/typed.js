import json from "./data.json" with { type: "json" };
import * as ns from "./data.json" with { type: "json" };

export const typed = { json, keys: Object.keys(ns) };

export const load = () => import("./data.json", { with: { type: "json" } });
