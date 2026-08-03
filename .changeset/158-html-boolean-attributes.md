---
"webpack": patch
---

Collapse the boolean HTML attributes the spec states that were missing (`alpha`, `img`'s `controls`, the `shadowroot*` trio, and the obsolete `compact`, `declare`, `nohref`, `noshade` and `nowrap`), and leave an ampersand bare where it cannot read back as a character reference.
