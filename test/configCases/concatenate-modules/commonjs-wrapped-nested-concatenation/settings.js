import { runtimeConfig } from "./runtime-config";

global.__nestedConcatOrder = (global.__nestedConcatOrder || []).concat(
	"settings"
);

export const settings = { apiBase: runtimeConfig.apiBase };
