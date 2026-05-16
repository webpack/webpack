/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/*
	webpack serialization binary format (v2)
	========================================

	A stream starts with magic "wps2", a format version byte and a flags byte.
	Every following value is a self-describing tag byte plus payload. Small
	unsigned integers 0..31 are encoded directly in the tag byte.
*/

const MAGIC = 0x32737077;
const FORMAT_VERSION = 1;
const SMALL_INT_MAX = 0x1f;

module.exports = {
	MAGIC,
	FORMAT_VERSION,
	SMALL_INT_MAX,
	T_NULL: 0x20,
	T_UNDEFINED: 0x21,
	T_TRUE: 0x22,
	T_FALSE: 0x23,
	T_INT: 0x24,
	T_F64: 0x25,
	T_BIGINT: 0x26,
	T_STR_EMPTY: 0x27,
	T_STR_INLINE: 0x28,
	T_STR: 0x29,
	T_STR_REF: 0x2a,
	T_BUF: 0x2b,
	T_OBJ_REF: 0x2c,
	T_ARRAY: 0x2d,
	T_OBJECT: 0x2e,
	T_NULL_PROTO: 0x2f,
	T_MAP: 0x30,
	T_SET: 0x31,
	T_DATE: 0x32,
	T_REGEXP: 0x33,
	T_TYPE_NEW: 0x34,
	T_TYPE_REF: 0x35,
	T_LAZY: 0x36,
	T_SEPARATE: 0x37
};
