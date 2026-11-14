---
"webpack": patch
---

Skip storing asset module binary data and compilation assets in the persistent filesystem cache to prevent cache packs from growing large for no speed gain.
