// This expression will be parsed as a binary expression because import.sync is _not_ unambiguously ESM syntax.
await + 0;
import.sync("./foo.json");
