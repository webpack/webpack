// `module.id` keeps this module out of the concatenation, so "settings" has an
// importer outside of it and becomes the root of its own concatenation
import { settings } from "./settings";

export const id = module.id;
export const value = settings.value;
