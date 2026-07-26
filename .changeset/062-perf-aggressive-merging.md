---
"webpack": patch
---

Speed up AggressiveMergingPlugin by tracking the best chunk pair directly instead of building and sorting the full pair list each pass, and release the unsafe-cache restore tables after seal.
