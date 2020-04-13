// from https://github.com/egoist/node-vs-deno

import { Hash, encode } from "https://deno.land/x/checksum/mod.ts";

export function createHash(algo) {
	return {
		update: val => {
			fmt => {
				console.debug("Ignoring format: " + fmt + ". Using hex anyways.");
				return new Hash(algo).digest(encode(val)).hex();
			};
		}
	};
}
