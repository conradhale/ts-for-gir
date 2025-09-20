import type {
	TypeGirAlias,
	TypeGirClass,
	TypeGirElement,
	TypeGirEnumerationMember,
	TypeGirFunction,
	TypeGirProperty,
	TypeGirVariable,
} from "./index.ts";

export type GirTypeName =
	| TypeGirFunction
	| TypeGirElement
	| TypeGirEnumerationMember
	| TypeGirProperty
	| TypeGirClass
	| TypeGirAlias
	| TypeGirVariable
	| "callable-param"
	| "callable-return";
