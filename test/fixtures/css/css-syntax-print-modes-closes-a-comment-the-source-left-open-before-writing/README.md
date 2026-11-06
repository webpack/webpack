§4.3.2 runs an unterminated comment to EOF, so a `;` or `}` after it

lands inside: `{y/*` grew to `{y/*}` to `{y/*}}` on every pass.

---

closes a comment the source left open before writing after it

@type {const}
