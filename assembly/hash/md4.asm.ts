/*
 ** ********************************************************************
 ** md4.c -- Implementation of MD4 Message Digest Algorithm           **
 ** Updated: 2/16/90 by Ronald L. Rivest                              **
 ** (C) 1990 RSA Data Security, Inc.                                  **
 ** ********************************************************************
 */

// Ported to assemblyscript by Tobias Koppers

let totalLength: u32;
let A: u32;
let B: u32;
let C: u32;
let D: u32;

function F(x: u32, y: u32, z: u32): u32 {
	return z ^ (x & (y ^ z));
}
function G(x: u32, y: u32, z: u32): u32 {
	return (x & (y | z)) | (y & z);
}
function H(x: u32, y: u32, z: u32): u32 {
	return x ^ y ^ z;
}

function roundF(a: u32, b: u32, c: u32, d: u32, i: u32, s: u32): u32 {
	return rotl<u32>(a + F(b, c, d) + load<u32>(i), s);
}
function roundG(a: u32, b: u32, c: u32, d: u32, i: u32, s: u32): u32 {
	return rotl<u32>(a + G(b, c, d) + load<u32>(i) + 0x5a827999, s);
}
function roundH(a: u32, b: u32, c: u32, d: u32, i: u32, s: u32): u32 {
	return rotl<u32>(a + H(b, c, d) + load<u32>(i) + 0x6ed9eba1, s);
}

export function init(): void {
	A = 0x67452301;
	B = 0xefcdab89;
	C = 0x98badcfe;
	D = 0x10325476;
	totalLength = 0;
}

function body(size: u32): void {
	let _A = A;
	let _B = B;
	let _C = C;
	let _D = D;

	for (let i: u32 = 0; i < size; i += 64) {
		let a = _A;
		let b = _B;
		let c = _C;
		let d = _D;

		// Round F

		a = roundF(a, b, c, d, i + 4 * 0, 3);
		d = roundF(d, a, b, c, i + 4 * 1, 7);
		c = roundF(c, d, a, b, i + 4 * 2, 11);
		b = roundF(b, c, d, a, i + 4 * 3, 19);

		a = roundF(a, b, c, d, i + 4 * 4, 3);
		d = roundF(d, a, b, c, i + 4 * 5, 7);
		c = roundF(c, d, a, b, i + 4 * 6, 11);
		b = roundF(b, c, d, a, i + 4 * 7, 19);

		a = roundF(a, b, c, d, i + 4 * 8, 3);
		d = roundF(d, a, b, c, i + 4 * 9, 7);
		c = roundF(c, d, a, b, i + 4 * 10, 11);
		b = roundF(b, c, d, a, i + 4 * 11, 19);

		a = roundF(a, b, c, d, i + 4 * 12, 3);
		d = roundF(d, a, b, c, i + 4 * 13, 7);
		c = roundF(c, d, a, b, i + 4 * 14, 11);
		b = roundF(b, c, d, a, i + 4 * 15, 19);

		// Round G

		a = roundG(a, b, c, d, i + 4 * 0, 3);
		d = roundG(d, a, b, c, i + 4 * 4, 5);
		c = roundG(c, d, a, b, i + 4 * 8, 9);
		b = roundG(b, c, d, a, i + 4 * 12, 13);

		a = roundG(a, b, c, d, i + 4 * 1, 3);
		d = roundG(d, a, b, c, i + 4 * 5, 5);
		c = roundG(c, d, a, b, i + 4 * 9, 9);
		b = roundG(b, c, d, a, i + 4 * 13, 13);

		a = roundG(a, b, c, d, i + 4 * 2, 3);
		d = roundG(d, a, b, c, i + 4 * 6, 5);
		c = roundG(c, d, a, b, i + 4 * 10, 9);
		b = roundG(b, c, d, a, i + 4 * 14, 13);

		a = roundG(a, b, c, d, i + 4 * 3, 3);
		d = roundG(d, a, b, c, i + 4 * 7, 5);
		c = roundG(c, d, a, b, i + 4 * 11, 9);
		b = roundG(b, c, d, a, i + 4 * 15, 13);

		// Round H

		a = roundH(a, b, c, d, i + 4 * 0, 3);
		d = roundH(d, a, b, c, i + 4 * 8, 9);
		c = roundH(c, d, a, b, i + 4 * 4, 11);
		b = roundH(b, c, d, a, i + 4 * 12, 15);

		a = roundH(a, b, c, d, i + 4 * 2, 3);
		d = roundH(d, a, b, c, i + 4 * 10, 9);
		c = roundH(c, d, a, b, i + 4 * 6, 11);
		b = roundH(b, c, d, a, i + 4 * 14, 15);

		a = roundH(a, b, c, d, i + 4 * 1, 3);
		d = roundH(d, a, b, c, i + 4 * 9, 9);
		c = roundH(c, d, a, b, i + 4 * 5, 11);
		b = roundH(b, c, d, a, i + 4 * 13, 15);

		a = roundH(a, b, c, d, i + 4 * 3, 3);
		d = roundH(d, a, b, c, i + 4 * 11, 9);
		c = roundH(c, d, a, b, i + 4 * 7, 11);
		b = roundH(b, c, d, a, i + 4 * 15, 15);

		_A += a;
		_B += b;
		_C += c;
		_D += d;
	}

	A = _A;
	B = _B;
	C = _C;
	D = _D;
}

export function update(length: u32): void {
	body(length);
	totalLength += length;
}

export function final(length: u32): void {
	const bits: u64 = u64(totalLength + length) << 3;
	const finalLength: u32 = (length + 9 + 63) & ~63;
	const bitsPosition = finalLength - 8;

	// end
	store<u8>(length++, 0x80);

	// padding
	for (; length & 7 && length < finalLength; length++) store<u8>(length, 0);
	for (; length < finalLength; length += 8) store<u64>(length, 0);

	// bits
	store<u64>(bitsPosition, bits);

	body(finalLength);

	store<u64>(0, u32ToHex(A));
	store<u64>(8, u32ToHex(B));
	store<u64>(16, u32ToHex(C));
	store<u64>(24, u32ToHex(D));
}

function u32ToHex(x: u64): u64 {
	// from https://johnnylee-sde.github.io/Fast-unsigned-integer-to-hex-string/

	x = ((x & 0xffff0000) << 16) | (x & 0xffff);
	x = ((x & 0x0000ff000000ff00) << 8) | (x & 0x000000ff000000ff);
	x = ((x & 0x00f000f000f000f0) >> 4) | ((x & 0x000f000f000f000f) << 8);

	const mask = ((x + 0x0606060606060606) >> 4) & 0x0101010101010101;

	x |= 0x3030303030303030;

	x += 0x27 * mask;

	return x;
}
