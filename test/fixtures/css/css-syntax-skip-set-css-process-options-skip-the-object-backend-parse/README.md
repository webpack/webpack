A skipping stream parse runs first, then a full parse: the object backend must reset the skip state so `parseA*` is never affected.
