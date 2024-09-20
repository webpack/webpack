/** @type {import("../../../../").LoaderDefinition}} */
module.exports = function () {
	const hashValue = this.utils.createHash(this.hashFunction);
	hashValue.update(this.hashSalt);
	hashValue.update("test");
	const digest = hashValue.digest(this.hashDigest);

	return `module.exports = ${JSON.stringify({
		digest,
		digestWithLength: digest.slice(0, this.hashDigestLength),
		hashFunction: this.hashFunction,
		hashDigest: this.hashDigest,
		hashDigestLength: this.hashDigestLength,
		hashSalt: this.hashSalt
	})};`;
};
