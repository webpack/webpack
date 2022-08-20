// //////////////////////////////////////////////////////////
// xxhash64.h
// Copyright (c) 2016 Stephan Brumme. All rights reserved.
// see http://create.stephan-brumme.com/disclaimer.html
//
// XXHash (64 bit), based on Yann Collet's descriptions, see
// http://cyan4973.github.io/xxHash/
//
// Modified for hash-wasm by Dani Biró
//
// Ported to assemblyscript by Tobias Koppers
// Modifications:
// - seed is always 0
// - update is only called with a multiple of 32
// - final takes the remaining 0 - 31 bytes
//

const Prime1: u64 = 11400714785074694791;
const Prime2: u64 = 14029467366897019727;
const Prime3: u64 = 1609587929392839161;
const Prime4: u64 = 9650029242287828579;
const Prime5: u64 = 2870177450012600261;

let state0: u64;
let state1: u64;
let state2: u64;
let state3: u64;
let totalLength: u64;

function processSingle(previous: u64, input: u64): u64 {
	return rotl(previous + input * Prime2, 31) * Prime1;
}

export function init(): void {
	state0 = Prime1 + Prime2;
	state1 = Prime2;
	state2 = 0;
	state3 = 0 - Prime1;
	totalLength = 0;
}

export function update(length: u32): void {
	if (length == 0) return;

	totalLength += length;

	let dataPtr: u32 = 0;

	let s0 = state0;
	let s1 = state1;
	let s2 = state2;
	let s3 = state3;

	do {
		s0 = processSingle(s0, load<u64>(dataPtr));
		s1 = processSingle(s1, load<u64>(dataPtr + 8));
		s2 = processSingle(s2, load<u64>(dataPtr + 16));
		s3 = processSingle(s3, load<u64>(dataPtr + 24));
		dataPtr += 32;
	} while (dataPtr < length);

	state0 = s0;
	state1 = s1;
	state2 = s2;
	state3 = s3;
}

export function final(length: u32): void {
	// fold 256 bit state into one single 64 bit value
	let result: u64;
	if (totalLength > 0) {
		result =
			rotl(state0, 1) + rotl(state1, 7) + rotl(state2, 12) + rotl(state3, 18);
		result = (result ^ processSingle(0, state0)) * Prime1 + Prime4;
		result = (result ^ processSingle(0, state1)) * Prime1 + Prime4;
		result = (result ^ processSingle(0, state2)) * Prime1 + Prime4;
		result = (result ^ processSingle(0, state3)) * Prime1 + Prime4;
	} else {
		result = Prime5;
	}

	result += totalLength + length;

	let dataPtr: u32 = 0;

	// at least 8 bytes left ? => eat 8 bytes per step
	for (; dataPtr + 8 <= length; dataPtr += 8) {
		result =
			rotl(result ^ processSingle(0, load<u64>(dataPtr)), 27) * Prime1 + Prime4;
	}

	// 4 bytes left ? => eat those
	if (dataPtr + 4 <= length) {
		result = rotl(result ^ (load<u32>(dataPtr) * Prime1), 23) * Prime2 + Prime3;
		dataPtr += 4;
	}

	// take care of remaining 0..3 bytes, eat 1 byte per step
	while (dataPtr !== length) {
		result = rotl(result ^ (load<u8>(dataPtr) * Prime5), 11) * Prime1;
		dataPtr++;
	}

	// mix bits
	result ^= result >> 33;
	result *= Prime2;
	result ^= result >> 29;
	result *= Prime3;
	result ^= result >> 32;

	store<u64>(0, u32ToHex(result >> 32));
	store<u64>(8, u32ToHex(result & 0xffffffff));
}

function u32ToHex(x: u64): u64 {
	// from https://johnnylee-sde.github.io/Fast-unsigned-integer-to-hex-string/

	x = ((x & 0xffff) << 32) | ((x & 0xffff0000) >> 16);
	x = ((x & 0x0000ff000000ff00) >> 8) | ((x & 0x000000ff000000ff) << 16);
	x = ((x & 0x00f000f000f000f0) >> 4) | ((x & 0x000f000f000f000f) << 8);

	const mask = ((x + 0x0606060606060606) >> 4) & 0x0101010101010101;

	x |= 0x3030303030303030;

	x += 0x27 * mask;

	return x;
}
