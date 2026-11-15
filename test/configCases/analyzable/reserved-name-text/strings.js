// Only a whole string literal is a chunk stand-in, and a hash length is never 0,
// so none of these is one even in source of our own.
export const inString =
	"see ./@@webpackAnalyzableChunk:W1sibGl0ZXJhbCIsIngiXV0@@ here";
export const noHash = "@@webpackFullHash-0@@";
export const leadingZero = "@@webpackFullHash-08@@";
