import type { GirFieldElement, GirMethodElement, GirPropertyElement, LocalNameType } from "./index.ts";

export interface LocalName {
	type: LocalNameType;
	method?: GirMethodElement;
	property?: GirPropertyElement;
	field?: GirFieldElement;
}
