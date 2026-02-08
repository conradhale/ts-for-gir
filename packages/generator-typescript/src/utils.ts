import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	filterConflicts,
	filterFunctionConflict,
	type IntrospectedClass,
	type IntrospectedInterface,
	type IntrospectedRecord,
	IntrospectedStaticClassFunction,
	IntrospectedVirtualClassFunction,
	isInvalid,
	transformGirDocText,
} from "@ts-for-gir/lib";
import ts, { factory } from "typescript";

export type JSDocTag = {
	tag: string;
	paramName?: string;
	comment?: string;
};

// Get __filename on ESM
const __filename = fileURLToPath(import.meta.url);
// Get __dirname on ESM, resolve to the root directory of this package
export const __dirname = resolve(dirname(__filename), "..");

export function asIdentifier<T extends ts.Node | undefined>(identifier: string | T): T | ts.Identifier {
	return typeof identifier === "string" ? factory.createIdentifier(identifier) : identifier;
}

export function asTypeReference<T extends ts.Node | undefined>(typeName: string | T): T | ts.TypeReferenceNode {
	return typeof typeName === "string" ? factory.createTypeReferenceNode(typeName) : typeName;
}

interface NamespaceModifiers {
	export?: boolean;
	declare?: boolean;
}

function getNamespaceModifiers(options: NamespaceModifiers) {
	const modifiers: ts.Modifier[] = [];
	if (options.export) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.ExportKeyword));
	}
	if (options.declare) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.DeclareKeyword));
	}

	return modifiers;
}

interface ClassModifiers extends NamespaceModifiers {
	abstract?: boolean;
}

function getClassModifiers(options: ClassModifiers) {
	const modifiers = getNamespaceModifiers(options);
	if (options.abstract) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.AbstractKeyword));
	}
	return modifiers;
}

interface MemberModifiers {
	visibility?: "public" | "private" | "protected";
	override?: boolean;
	static?: boolean;
}

function getMemberModifiers(options: MemberModifiers) {
	const modifiers: ts.Modifier[] = [];
	if (options.visibility) {
		let kind: ts.ModifierSyntaxKind;
		switch (options.visibility) {
			case "public":
				kind = ts.SyntaxKind.PublicKeyword;
				break;
			case "protected":
				kind = ts.SyntaxKind.ProtectedKeyword;
				break;
			case "private":
				kind = ts.SyntaxKind.PrivateKeyword;
				break;
		}
		modifiers.push(factory.createModifier(kind));
	}
	if (options.override) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.OverrideKeyword));
	}
	if (options.static) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.StaticKeyword));
	}

	return modifiers;
}

interface PropertyModifiers extends MemberModifiers {
	readonly?: boolean;
}

function getPropertyModifiers(options: PropertyModifiers) {
	const modifiers = getMemberModifiers(options);
	if (options.readonly) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.ReadonlyKeyword));
	}
	return modifiers;
}

interface FunctionModifiers extends NamespaceModifiers {
	async?: boolean;
}

function getFunctionModifiers(options: FunctionModifiers) {
	const modifiers = getNamespaceModifiers(options);
	if (options.async) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.AsyncKeyword));
	}
	return modifiers;
}

interface MethodModifiers extends MemberModifiers {
	async?: boolean;
	abstract?: boolean;
}

function getMethodModifiers(options: MethodModifiers) {
	const modifiers = getMemberModifiers(options);
	if (options.async) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.AsyncKeyword));
	}
	if (options.abstract) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.AbstractKeyword));
	}
	return modifiers;
}

interface TypeModifiers {
	readonly?: boolean;
}

function _getTypeModifiers(options: TypeModifiers) {
	const modifiers: ts.Modifier[] = [];
	if (options.readonly) {
		modifiers.push(factory.createModifier(ts.SyntaxKind.ReadonlyKeyword));
	}
	return modifiers;
}

export interface TypeAliasOptions extends CommentOptions, NamespaceModifiers {
	type: string | ts.TypeNode;
	typeParams?: ts.TypeParameterDeclaration[];
}

export function createTypeAlias(name: string | ts.Identifier, options: TypeAliasOptions) {
	return addComments(
		factory.createTypeAliasDeclaration(
			getNamespaceModifiers(options),
			name,
			options.typeParams,
			asTypeReference(options.type),
		),
		options,
	);
}

export interface ConstOptions extends CommentOptions, NamespaceModifiers {
	type?: string | ts.TypeNode;
}

export function createConst(name: string | ts.BindingName, options: ConstOptions) {
	return addComments(
		factory.createVariableStatement(
			getNamespaceModifiers(options),
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(name, undefined, asTypeReference(options.type))],
				ts.NodeFlags.Const,
			),
		),
		options,
	);
}

export function createExpressionWithTypeArguments(
	expression: ts.Expression,
	...typeArguments: (string | ts.TypeNode)[]
) {
	const typeArgs = typeArguments.map((arg) => (typeof arg === "string" ? factory.createTypeReferenceNode(arg) : arg));
	return factory.createExpressionWithTypeArguments(expression, typeArgs);
}

export function createTypeReferenceNode(identifier: ts.EntityName, ...typeArguments: (string | ts.TypeNode)[]) {
	const typeArgs = typeArguments.map((arg) => (typeof arg === "string" ? factory.createTypeReferenceNode(arg) : arg));
	return factory.createTypeReferenceNode(identifier, typeArgs);
}

export function createExpression(left: string | ts.Expression, ...segments: (string | ts.MemberName)[]) {
	let expression = asIdentifier(left);
	for (const segment of segments) {
		const identifier = asIdentifier(segment);
		expression = expression ? factory.createPropertyAccessExpression(expression, identifier) : identifier;
	}
	return expression;
}

export function createEntityName(left: string | ts.EntityName, ...segments: (string | ts.Identifier)[]) {
	let expression = asIdentifier(left);
	for (const segment of segments) {
		const identifier = asIdentifier(segment);
		expression = expression ? factory.createQualifiedName(expression, identifier) : identifier;
	}
	return expression;
}

export function createModifier(modifier: ts.ModifierSyntaxKind) {
	return factory.createModifier(modifier);
}

export function createModifiers(...modifiers: ts.ModifierSyntaxKind[]) {
	return modifiers.map(createModifier);
}

export function createAnyArgsParameter() {
	return factory.createParameterDeclaration(
		undefined,
		factory.createToken(ts.SyntaxKind.DotDotDotToken),
		"args",
		undefined,
		factory.createArrayTypeNode(factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
	);
}

export function createAnyFunctionType() {
	return factory.createFunctionTypeNode(
		undefined,
		[createAnyArgsParameter()],
		factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
	);
}

export interface ModuleOptions extends NamespaceModifiers, CommentOptions {
	statements?: ts.Statement[];
	namespace?: boolean;
}

export function createModule(name: string | ts.ModuleName, options: ModuleOptions) {
	return addComments(
		factory.createModuleDeclaration(
			getNamespaceModifiers(options),
			typeof name === "string"
				? options.namespace
					? factory.createIdentifier(name)
					: factory.createStringLiteral(name)
				: name,
			factory.createModuleBlock(options.statements ?? []),
			options.namespace ? ts.NodeFlags.Namespace : undefined,
		),
		options,
	);
}

export interface ClassOptions extends ClassModifiers, CommentOptions {
	members?: ts.ClassElement[];
	typeParams?: ts.TypeParameterDeclaration[];
	extends?: ts.ExpressionWithTypeArguments;
	implements?: ts.ExpressionWithTypeArguments[];
}

export function createClass(name: string | ts.Identifier, options: ClassOptions) {
	const heritageClauses: ts.HeritageClause[] = [];
	if (options.extends) {
		heritageClauses.push(factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [options.extends]));
	}
	if (options.implements && options.implements.length > 0) {
		heritageClauses.push(factory.createHeritageClause(ts.SyntaxKind.ImplementsKeyword, options.implements));
	}
	return addComments(
		factory.createClassDeclaration(
			getClassModifiers(options),
			name,
			options.typeParams,
			heritageClauses,
			options.members ?? [],
		),
		options,
	);
}

export interface InterfaceOptions extends NamespaceModifiers, CommentOptions {
	members?: ts.TypeElement[];
	typeParams?: ts.TypeParameterDeclaration[];
	extends?: ts.ExpressionWithTypeArguments[];
}

export function createInterface(name: string | ts.Identifier, options: InterfaceOptions) {
	const heritageClauses =
		options.extends && options.extends.length > 0
			? [factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, options.extends)]
			: undefined;

	return addComments(
		factory.createInterfaceDeclaration(
			getNamespaceModifiers(options),
			name,
			options.typeParams,
			heritageClauses,
			options.members ?? [],
		),
		options,
	);
}

export interface EnumMemberOptions extends CommentOptions {
	value?: number;
}

export function createEnumMember(name: string | ts.PropertyName, options: EnumMemberOptions) {
	let literal: ts.Expression | undefined;
	if (options.value) {
		if (options.value < 0) {
			literal = factory.createPrefixMinus(factory.createNumericLiteral(options.value * -1));
		} else {
			literal = factory.createNumericLiteral(options.value);
		}
	}

	return addComments(factory.createEnumMember(asMemberName(name), literal), options);
}

export interface EnumOptions extends CommentOptions, NamespaceModifiers {
	members?: ts.EnumMember[];
}

export function createEnum(name: string | ts.Identifier, options: EnumOptions) {
	return addComments(
		factory.createEnumDeclaration(getNamespaceModifiers(options), name, options.members ?? []),
		options,
	);
}

export interface ParameterOptions {
	varArgs?: boolean;
	optional?: boolean;
	type?: ts.TypeNode | string;
}

export function createParameterDeclaration(name: string | ts.BindingName, options: ParameterOptions) {
	return factory.createParameterDeclaration(
		undefined,
		options.varArgs ? factory.createToken(ts.SyntaxKind.DotDotDotToken) : undefined,
		name,
		options.optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
		asTypeReference(options.type),
	);
}

export function asPropertyName<T extends ts.PropertyName>(name: string | T, computed?: boolean) {
	if (typeof name !== "string") {
		return name;
	}

	if (computed) {
		return factory.createComputedPropertyName(factory.createStringLiteral(name));
	}
	return asMemberName(name);
}

export interface GetAccessorOptions extends CommentOptions, PropertyModifiers {
	type?: string | ts.TypeNode;
	params?: ts.ParameterDeclaration[];
}

export function createGetAccessor(name: string | ts.PropertyName, options: GetAccessorOptions) {
	return addComments(
		factory.createGetAccessorDeclaration(
			getPropertyModifiers(options),
			asMemberName(name),
			options.params ?? [],
			asTypeReference(options.type),
			undefined,
		),
		options,
	);
}

export interface SetAccessorOptions extends CommentOptions, PropertyModifiers {
	params?: ts.ParameterDeclaration[];
}

export function createSetAccessor(name: string | ts.PropertyName, options: SetAccessorOptions) {
	return addComments(
		factory.createSetAccessorDeclaration(
			getPropertyModifiers(options),
			asMemberName(name),
			options.params ?? [],
			undefined,
		),
		options,
	);
}

export interface PropertyOptions extends CommentOptions, PropertyModifiers {
	type?: string | ts.TypeNode;
	optional?: boolean;
	computed?: boolean;
}

export function createPropertyDeclaration(name: string | ts.PropertyName, options: PropertyOptions) {
	return addComments(
		factory.createPropertyDeclaration(
			getPropertyModifiers(options),
			asPropertyName(name, options.computed),
			options.optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
			asTypeReference(options.type),
			undefined,
		),
		options,
	);
}

export function createPropertySignature(name: string | ts.PropertyName, options: PropertyOptions) {
	return addComments(
		factory.createPropertySignature(
			undefined,
			asPropertyName(name, options.computed),
			options.optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
			asTypeReference(options.type),
		),
		options,
	);
}

export interface CommentOptions {
	comment?: string;
	docComment?: string;
	docTags?: JSDocTag[];
}

export function asMemberName<T extends ts.PropertyName>(name: string | T): ts.Identifier | ts.StringLiteral | T {
	if (typeof name !== "string") {
		return name;
	}

	const invalid = isInvalid(name);

	if (invalid) {
		return factory.createStringLiteral(name);
	}
	return factory.createIdentifier(name);
}

function addComments<T extends ts.Node>(node: T, options: CommentOptions): T {
	addInfoComment(node, options.comment);
	addGirDocComment(node, options.docComment, options.docTags);
	return node;
}

export interface FunctionOptions extends CommentOptions, FunctionModifiers {
	params?: ts.ParameterDeclaration[];
	typeParams?: ts.TypeParameterDeclaration[];
	returnType?: string | ts.TypeNode;
}

export interface MethodOptions extends CommentOptions, MethodModifiers {
	params?: ts.ParameterDeclaration[];
	typeParams?: ts.TypeParameterDeclaration[];
	returnType?: string | ts.TypeNode;
	optional?: boolean;
}

export function createFunctionDeclaration(name: string | ts.Identifier, options: FunctionOptions) {
	return addComments(
		factory.createFunctionDeclaration(
			getFunctionModifiers(options),
			undefined,
			name,
			options.typeParams,
			options.params ?? [],
			asTypeReference(options.returnType),
			undefined,
		),
		options,
	);
}

export function createMethodDeclaration(name: string | ts.PropertyName, options: MethodOptions) {
	return addComments(
		factory.createMethodDeclaration(
			getMethodModifiers(options),
			undefined,
			asMemberName(name),
			options.optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
			options.typeParams,
			options.params ?? [],
			asTypeReference(options.returnType),
			undefined,
		),
		options,
	);
}

export function createMethodSignature(name: string | ts.PropertyName, options: MethodOptions) {
	return addComments(
		factory.createMethodSignature(
			undefined,
			asMemberName(name),
			options.optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
			options.typeParams,
			options.params ?? [],
			asTypeReference(options.returnType),
		),
		options,
	);
}

export function prependComments<T extends ts.Node[]>(nodes: T, comments: CommentOptions) {
	if (nodes.length > 0) {
		addComments(nodes[0], comments);
	}
	return nodes;
}

export function prependInfoComment<T extends ts.Node[]>(nodes: T, comment: string | undefined) {
	if (comment && nodes.length > 0) {
		addInfoComment(nodes[0], comment);
	}
	return nodes;
}

/**
 * Adds the documentation as comments
 */
export function addJSDocComment<T extends ts.Node>(
	node: T,
	comment: string | null | undefined,
	tags?: readonly JSDocTag[],
) {
	if (!comment) {
		return node;
	}

	let text = `*\n * ${comment.replace(/\n/g, "\n * ")}`;

	const tagText = tags
		?.map(({ tag, comment, paramName }) => {
			let text = `\n * @${tag}`;
			if (paramName) {
				text += ` ${paramName}`;
			}
			if (comment) {
				text += ` ${comment.replace(/\n/g, "\n * ")}`;
			}
			return text;
		})
		.join("");

	if (tagText) {
		text += `\n * ${tagText}`;
	}

	return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, `${text}\n`, true);
}

/**
 * Adds the documentation as comments
 */
export function addGirDocComment<T extends ts.Node>(
	node: T,
	comment: string | null | undefined,
	tags?: readonly JSDocTag[],
) {
	if (!comment) {
		return node;
	}

	return addJSDocComment(node, transformGirDocText(comment), tags);
}

/**
 * Adds an info comment, is used for debugging the generated types
 */
export function addInfoComment<T extends ts.Node>(node: T, text: string | null | undefined, multiline = false) {
	if (!text) {
		return node;
	}

	if (!multiline) {
		text = ` ${text}`;
	}

	const kind = multiline ? ts.SyntaxKind.MultiLineCommentTrivia : ts.SyntaxKind.SingleLineCommentTrivia;

	const comments = ts.getSyntheticLeadingComments(node);
	if (!comments) {
		return ts.addSyntheticLeadingComment(node, kind, text, true);
	}
	return ts.setSyntheticLeadingComments(node, [
		{ kind, pos: -1, end: -1, hasTrailingNewLine: true, text },
		...comments,
	]);
}

export function filterFields(girClass: IntrospectedClass | IntrospectedInterface | IntrospectedRecord) {
	return filterConflicts(
		girClass.namespace,
		girClass,
		girClass.fields.filter((field) => !field.isStatic),
	);
}

export function filterStaticFields(girClass: IntrospectedClass | IntrospectedInterface | IntrospectedRecord) {
	return filterConflicts(
		girClass.namespace,
		girClass,
		girClass.fields.filter((field) => field.isStatic),
	);
}

export function filterProperties(girClass: IntrospectedClass | IntrospectedInterface | IntrospectedRecord) {
	return filterConflicts(girClass.namespace, girClass, girClass.props);
}

export function filterMethods(girClass: IntrospectedClass | IntrospectedInterface | IntrospectedRecord) {
	return filterFunctionConflict(
		girClass.parent,
		girClass,
		[...girClass.members].filter(
			(member) =>
				!(member instanceof IntrospectedStaticClassFunction) && !(member instanceof IntrospectedVirtualClassFunction),
		),
		[],
	);
}

export function filterStaticMethods(girClass: IntrospectedClass | IntrospectedInterface | IntrospectedRecord) {
	return filterFunctionConflict(
		girClass.parent,
		girClass,
		[...girClass.members].filter((member) => member instanceof IntrospectedStaticClassFunction),
		[],
	);
}

export function filterVirtualMethods(girClass: IntrospectedClass | IntrospectedInterface | IntrospectedRecord) {
	return filterFunctionConflict(
		girClass.parent,
		girClass,
		[...girClass.members.values()].filter((fn) => fn instanceof IntrospectedVirtualClassFunction),
		[],
	);
}
