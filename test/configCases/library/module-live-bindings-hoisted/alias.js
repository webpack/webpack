import { counter as current } from "./store.js";

export const readAlias = () => [current, typeof counter];
