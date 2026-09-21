import { sharedDep } from "./shared-dep";

global.__nestedConcatOrder = (global.__nestedConcatOrder || []).concat("shared");

export const shared = `shared:${sharedDep}`;
