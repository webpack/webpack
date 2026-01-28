"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Default hash function and all hash digests
	{
		output: {
			hashDigest: "base64url"
		}
	},
	{
		output: {
			hashDigest: "base26"
		}
	},
	{
		output: {
			hashDigest: "base32"
		}
	},
	{
		output: {
			hashDigest: "base36"
		}
	},
	{
		output: {
			hashDigest: "base49"
		}
	},
	{
		output: {
			hashDigest: "base52"
		}
	},
	{
		output: {
			hashDigest: "base58"
		}
	},
	{
		output: {
			hashDigest: "base62"
		}
	},
	{
		output: {
			hashDigest: "hex"
		}
	},
	// xxhash64
	{
		output: {
			hashFunction: "xxhash64"
		}
	},
	{
		output: {
			hashFunction: "xxhash64",
			hashDigest: "base64url"
		}
	},
	{
		output: {
			hashFunction: "xxhash64",
			hashDigest: "base32"
		}
	},
	{
		output: {
			hashFunction: "xxhash64",
			hashDigest: "hex"
		}
	},
	// md4
	{
		output: {
			hashFunction: "md4"
		}
	},
	{
		output: {
			hashFunction: "md4",
			hashDigest: "base64url"
		}
	},
	{
		output: {
			hashFunction: "md4",
			hashDigest: "base32"
		}
	},
	{
		output: {
			hashFunction: "md4",
			hashDigest: "hex"
		}
	},
	// sha512
	{
		output: {
			hashFunction: "sha512"
		}
	},
	{
		output: {
			hashFunction: "sha512",
			hashDigest: "base64url"
		}
	},
	{
		output: {
			hashFunction: "sha512",
			hashDigest: "base32"
		}
	},
	{
		output: {
			hashFunction: "sha512",
			hashDigest: "hex"
		}
	}
];
