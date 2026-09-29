// requests `local` after `mod.js` is built
import { local } from "./lib/barrel.js";

export const useLocal = () => local();
