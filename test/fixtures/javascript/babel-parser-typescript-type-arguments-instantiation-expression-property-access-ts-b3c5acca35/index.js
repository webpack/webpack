// invalid
a<b>.c;
a<b>?.c;
a<b>?.[c];

// valid
a<b>?.(c);
(a<b>).c;
(a<b>)?.c;
(a<b>)?.[c];

// longer, invalid
a?.b<c>.d
