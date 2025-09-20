import type { GirRepository, GirXML } from "@gi.ts/parser";

export interface ParsedGir extends GirXML {
	repository: GirRepository[];
}
