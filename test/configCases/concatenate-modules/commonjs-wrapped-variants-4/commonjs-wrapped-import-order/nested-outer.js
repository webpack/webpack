import { tag } from "./nested-inner";

global.__nestedOrder = (global.__nestedOrder || []).concat("nested-outer");

export const label = `outer:${tag}`;
