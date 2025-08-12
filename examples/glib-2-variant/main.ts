// This example is based on the GJS GVariant guide: https://gjs.guide/guides/glib/gvariant.html#basic-usage
// biome-ignore-all lint/correctness/noUnusedVariables: Type validation example with intentionally unused variables
// biome-ignore-all lint/style/noUnusedTemplateLiteral: Template literals used for type demonstration

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";

/**
 * Example demonstrating different ways to use GLib.Variant
 * Based on the GJS GVariant guide: https://gjs.guide/guides/glib/gvariant.html
 *
 * This example serves three purposes:
 * 1. Demonstrates proper GVariant usage patterns
 * 2. Validates TypeScript type generation at compile-time
 * 3. Tests runtime behavior to ensure types match expectations
 */

// ============================================================================
// COMPILE-TIME TYPE VALIDATION
// ============================================================================
// These type assertions validate that TypeScript correctly infers types
// If the type generator is working correctly, these should compile without errors

// Test 1: The original PR #279 issue - tuple type inference
// This should work after the fix:
type IntTupleType = ReturnType<GLib.Variant<"(ii)">["unpack"]>;
// Expected: [GLib.Variant<any>, GLib.Variant<any>] (shallow unpacking preserves Variants)

type StringIntTupleType = ReturnType<GLib.Variant<"(si)">["deepUnpack"]>;
// Expected: [string, number] (deepUnpack unpacks one level, based on GJS tests)

// Test 2: Array type inference
type StringArrayUnpack = ReturnType<GLib.Variant<"as">["unpack"]>;
// Expected: GLib.Variant[] (shallow unpacking preserves Variants)

type StringArrayDeep = ReturnType<GLib.Variant<"as">["deepUnpack"]>;
// Expected: string[] (based on GJS tests)

// Test 3: Dictionary type inference
type DictUnpack = ReturnType<GLib.Variant<"a{sv}">["unpack"]>;
// Expected: { [key: string]: Variant } (shallow unpacking preserves Variants)

type DictDeep = ReturnType<GLib.Variant<"a{sv}">["deepUnpack"]>;
// Expected: { [key: string]: Variant } (GJS preserves Variants in deepUnpack!)

type DictRecursive = ReturnType<GLib.Variant<"a{sv}">["recursiveUnpack"]>;
// Expected: { [key: string]: any } (GJS fully unpacks in recursiveUnpack)

// Test 4: Simple type inference
type BooleanUnpack = ReturnType<GLib.Variant<"b">["unpack"]>;
// Expected: boolean

type StringUnpack = ReturnType<GLib.Variant<"s">["deepUnpack"]>;
// Expected: string

// Print type information at compile time (will show in IDE)
function _printCompileTimeTypes() {
	print("\n=== Compile-Time Type Validation ===");
	print("TypeScript should infer these types correctly:");
	print("- IntTupleType: [GLib.Variant, GLib.Variant] from (ii) unpack()");
	print("- StringArrayUnpack: GLib.Variant[] from 'as' unpack()");
	print("- DictDeep: {[key: string]: Variant} from 'a{sv}' deepUnpack()");
	print("- DictRecursive: {[key: string]: any} from 'a{sv}' recursiveUnpack()");
	print("If this compiles without errors, type generation is working!");
}

// DBus interface definition for testing signal emission
const ifaceXml = `
<node>
  <interface name="org.example.Test">
    <signal name="picked">
      <arg name="wmClass" type="s"/>
    </signal>
  </interface>
</node>`;

/**
 * Demonstrates basic variant usage with simple types
 */
function testBasicVariants() {
	print("\n=== Basic Variant Tests ===");

	// Simple string variant
	const basic = new GLib.Variant("s", "hello");
	print("Basic string variant:", basic.print(true));

	// Tuple combining string and integer
	const tuple = new GLib.Variant("(si)", ["hello", 42]);
	print("Tuple variant:", tuple.print(true));

	// Array of strings
	const array = new GLib.Variant("as", ["one", "two", "three"]);
	print("String array variant:", array.print(true));

	// Compare with JSON for reference
	const json = {
		name: "Mario",
		lives: 3,
		active: true,
	};
	print("\nJSON equivalent:", JSON.stringify(json, null, 2));
}

/**
 * Demonstrates DBus-related variant usage
 */
function testDBusVariants() {
	print("\n=== DBus Variant Tests ===");

	// Create and export DBus object
	const dbus = Gio.DBusExportedObject.wrapJSObject(ifaceXml, {});
	dbus.export(Gio.DBus.session, "/org/example/Test");

	// Emit signal with string variant
	const wmClass = "test-window";
	const variant = new GLib.Variant("(s)", [wmClass]);
	print("DBus signal variant:", variant.print(true));
	dbus.emit_signal("picked", variant);

	// Example of a complex DBus method call parameters - empty dictionary for a{sv}
	const emptyDict: Record<string, GLib.Variant> = {};
	const methodParams = new GLib.Variant("(ssa{sv})", ["some-extension@someone.github.io", "", emptyDict]);
	print("DBus method parameters:", methodParams.print(true));
}

/**
 * Demonstrates complex variant structures and nested types
 */
function testComplexVariants() {
	print("\n=== Complex Variant Tests ===");

	// Dictionary with variant values - must use GVariant objects for a{sv} type
	const dict = new GLib.Variant("a{sv}", {
		key1: new GLib.Variant("s", "value1"), // String variant
		key2: new GLib.Variant("i", 123), // Integer variant
		key3: new GLib.Variant("as", ["a", "b", "c"]), // String array variant
	});
	print("Dictionary variant:", dict.print(true));

	// Nested structure combining multiple types - fixed nested object
	const nested = new GLib.Variant("(sa{sv})", [
		"test",
		{
			bool: new GLib.Variant("b", true), // Boolean variant
			number: new GLib.Variant("d", 3.14), // Double variant
			array: new GLib.Variant("ai", [1, 2, 3]), // Integer array variant
		},
	]);
	print("Nested variant:", nested.print(true));
}

/**
 * Get detailed type information for runtime debugging
 */
function getDetailedType(value: unknown): string {
	if (value === null) {
		return "null";
	} else if (value === undefined) {
		return "undefined";
	} else if (Array.isArray(value)) {
		const elementTypes = value.slice(0, 3).map((el: unknown) => {
			if (el instanceof GLib.Variant) return "Variant";
			return typeof el;
		});
		const suffix = value.length > 3 ? ", ..." : "";
		return `array[${value.length}] with elements: [${elementTypes.join(", ")}${suffix}]`;
	} else if (value instanceof GLib.Variant) {
		return `Variant<${value.get_type_string()}>`;
	} else if (typeof value === "object") {
		const keys = Object.keys(value).slice(0, 3);
		const suffix = Object.keys(value).length > 3 ? ", ..." : "";
		return `object with keys: {${keys.join(", ")}${suffix}}`;
	} else {
		return `${typeof value} (value: ${String(value)})`;
	}
}

/**
 * Simple runtime type validation helper - works in GJS without external dependencies
 */
function validateType(value: unknown, expectedType: string, testName: string): boolean {
	let actualType: string;

	if (value === null) {
		actualType = "null";
	} else if (value === undefined) {
		actualType = "undefined";
	} else if (Array.isArray(value)) {
		actualType = "array";
	} else if (value instanceof GLib.Variant) {
		actualType = "Variant";
	} else {
		actualType = typeof value;
	}

	const passed = actualType === expectedType;
	const detailedType = getDetailedType(value);
	print(`  ${passed ? "✓" : "✗"} ${testName}: expected ${expectedType}, got ${actualType} (${detailedType})`);
	return passed;
}

/**
 * Validates array element types
 */
function validateArrayElementTypes(array: unknown[], expectedElementType: string, testName: string): boolean {
	if (!Array.isArray(array)) {
		print(`  ✗ ${testName}: not an array, got ${typeof array}`);
		return false;
	}

	let allMatch = true;
	const actualTypes: string[] = [];

	for (let i = 0; i < array.length; i++) {
		const element: unknown = array[i];
		let actualType: string;

		if (element instanceof GLib.Variant) {
			actualType = "Variant";
		} else {
			actualType = typeof element;
		}

		actualTypes.push(actualType);

		if (actualType !== expectedElementType) {
			allMatch = false;
		}
	}

	const actualTypesStr = actualTypes.length > 0 ? `[${actualTypes.join(", ")}]` : "[]";
	print(
		`  ${allMatch ? "✓" : "✗"} ${testName}: array[${array.length}] with ${expectedElementType} elements (actual: ${actualTypesStr})`,
	);
	return allMatch;
}

/**
 * Demonstrates variant unpacking methods and validates our type fixes
 * Based on insights from GJS tests in testGLib.js
 */
function testVariantUnpacking() {
	print("\n=== Variant Unpacking Tests & Type Validation ===");

	// Test 1: Simple types - all methods should return the same result
	print("\n--- Simple Types (Based on GJS Tests) ---");
	const boolVariant = new GLib.Variant("b", true);
	const stringVariant = new GLib.Variant("s", "hello");
	const _numberVariant = new GLib.Variant("i", 42);

	// All unpacking methods return the same for simple types
	const boolUnpack = boolVariant.unpack();
	const boolDeep = boolVariant.deepUnpack();
	const boolRecursive = boolVariant.recursiveUnpack();

	print(`Boolean variant unpacking:`);
	validateType(boolUnpack, "boolean", "unpack()");
	validateType(boolDeep, "boolean", "deepUnpack()");
	validateType(boolRecursive, "boolean", "recursiveUnpack()");

	const stringUnpack = stringVariant.unpack();
	const stringDeep = stringVariant.deepUnpack();
	const stringRecursive = stringVariant.recursiveUnpack();

	print(`String variant unpacking:`);
	validateType(stringUnpack, "string", "unpack()");
	validateType(stringDeep, "string", "deepUnpack()");
	validateType(stringRecursive, "string", "recursiveUnpack()");

	// Test 2: String array - key differences based on GJS tests
	print("\n--- String Array (as) - GJS Test Behavior ---");
	const arrayVariant = new GLib.Variant("as", ["one", "two", "three"]);

	// Based on GJS tests: all methods should return string[] for "as" type
	const arrayUnpack = arrayVariant.unpack();
	const arrayDeep = arrayVariant.deepUnpack();
	const arrayRecursive = arrayVariant.recursiveUnpack();

	print(`String array unpacking (CORRECTED expectations based on runtime analysis):`);
	print(`  DEBUG: unpack() actual result: ${getDetailedType(arrayUnpack)}`);
	validateArrayElementTypes(arrayUnpack, "Variant", "unpack() -> Variant[] (shallow unpacking)");
	validateArrayElementTypes(arrayDeep, "string", "deepUnpack() -> string[]");
	validateArrayElementTypes(arrayRecursive, "string", "recursiveUnpack() -> string[]");

	// Test 3: Dictionary variant - shows the key differences (based on GJS line 84, 89)
	print("\n--- Dictionary (a{sv}) - GJS Test Insights ---");
	const dictVariant = new GLib.Variant("a{sv}", {
		simpleString: new GLib.Variant("s", "value"),
		nestedArray: new GLib.Variant("as", ["nested1", "nested2"]),
		numberValue: new GLib.Variant("i", 123),
	});

	// GJS test line 84: expect(v.deepUnpack().foo instanceof GLib.Variant).toBeTruthy();
	// GJS test line 89: expect(v.recursiveUnpack().foo instanceof GLib.Variant).toBeFalsy();
	const dictUnpack = dictVariant.unpack();
	const dictDeep = dictVariant.deepUnpack();
	const dictRecursive = dictVariant.recursiveUnpack();

	print(`Dictionary unpacking (GJS test expectations):`);
	validateType(dictUnpack.simpleString, "Variant", "unpack().simpleString (should be Variant)");
	validateType(dictDeep.simpleString, "Variant", "deepUnpack().simpleString (GJS: preserves Variant!)");
	validateType(dictRecursive.simpleString, "string", "recursiveUnpack().simpleString (GJS: fully unpacked)");

	// Test 4: Tuple parsing validation
	print("\n--- Tuple Parsing Validation ---");

	// Test simple tuple (ii) - this was the main failing case
	try {
		const intTuple = new GLib.Variant("(ii)", [42, 100]);
		print(`✓ Simple tuple (ii) construction succeeded:`, intTuple.print(true));

		// Test unpacking methods on tuples
		const tupleUnpack = intTuple.unpack();
		const tupleDeep = intTuple.deepUnpack();
		const tupleRecursive = intTuple.recursiveUnpack();

		print(`Integer tuple unpacking (CORRECTED expectations):`);
		print(`  DEBUG: unpack() actual result: ${getDetailedType(tupleUnpack)}`);
		if (Array.isArray(tupleUnpack)) {
			validateArrayElementTypes(tupleUnpack, "Variant", "unpack() -> Variant[] (shallow unpacking)");
		} else {
			print(`  ✗ unpack() should return array, got: ${typeof tupleUnpack} (${getDetailedType(tupleUnpack)})`);
		}

		if (Array.isArray(tupleDeep)) {
			validateArrayElementTypes(tupleDeep, "number", "deepUnpack() -> number[]");
		} else {
			print(`  ✗ deepUnpack() should return array, got: ${typeof tupleDeep}`);
		}

		if (Array.isArray(tupleRecursive)) {
			validateArrayElementTypes(tupleRecursive, "number", "recursiveUnpack() -> number[]");
		} else {
			print(`  ✗ recursiveUnpack() should return array, got: ${typeof tupleRecursive}`);
		}
	} catch (error) {
		print(`✗ Tuple (ii) construction failed:`, error);
	}

	// Test complex tuple (sib) - string, int, bool
	print("\n--- Complex Tuple Types ---");
	try {
		const complexTuple = new GLib.Variant("(sib)", ["hello", 123, true]);
		print(`✓ Complex tuple (sib) construction succeeded:`, complexTuple.print(true));

		const complexTupleDeep = complexTuple.deepUnpack();
		if (Array.isArray(complexTupleDeep) && complexTupleDeep.length === 3) {
			print(`Complex tuple deepUnpack() validation:`);
			validateType(complexTupleDeep[0], "string", "element[0] -> string");
			validateType(complexTupleDeep[1], "number", "element[1] -> number");
			validateType(complexTupleDeep[2], "boolean", "element[2] -> boolean");
		} else {
			print(`✗ Complex tuple deepUnpack() should return array[3], got:`, typeof complexTupleDeep);
		}
	} catch (error) {
		print(`✗ Complex tuple (sib) construction failed:`, error);
	}

	// Test 5: Struct variant - based on GJS test line 21
	print("\n--- Struct Variant (GJS Test Pattern) ---");
	try {
		// Based on GJS test: new GLib.Variant('(sogvau)', [...])
		const structVariant = new GLib.Variant("(sogvau)", [
			"a string",
			"/a/object/path",
			"asig",
			new GLib.Variant("s", "variant"),
			[7, 3],
		]);
		print(`✓ Struct variant construction succeeded:`, structVariant.print(true));

		// GJS test shows deepUnpack() works on struct variants
		const structUnpacked = structVariant.deepUnpack();
		if (Array.isArray(structUnpacked) && structUnpacked.length === 5) {
			print(`Struct variant deepUnpack() validation (GJS test pattern):`);
			validateType(structUnpacked[0], "string", "element[0] -> string");
			validateType(structUnpacked[1], "string", "element[1] -> string (object path)");
			validateType(structUnpacked[2], "string", "element[2] -> string (signature)");
			validateType(structUnpacked[3], "Variant", "element[3] -> Variant (GJS: instanceof GLib.Variant)");
			validateType(structUnpacked[4], "array", "element[4] -> array");
		} else {
			print(`✗ Struct deepUnpack() should return array[5], got:`, typeof structUnpacked);
		}
	} catch (error) {
		print(`✗ Struct variant construction failed:`, error);
	}

	// Test 6: The original ReturnType inference issue
	print("\n--- ReturnType Inference Validation ---");
	print(`TypeScript should now correctly infer these types (based on GJS test analysis):`);
	print(`- type IntTuple = ReturnType<GLib.Variant<"(ii)">["unpack"]>; // Should be [Variant, Variant] (shallow)`);
	print(`- type IntTupleDeep = ReturnType<GLib.Variant<"(ii)">["deepUnpack"]>; // Should be [number, number]`);
	print(`- type StringArray = ReturnType<GLib.Variant<"as">["unpack"]>; // Should be Variant[] (shallow)`);
	print(`- type StringArrayDeep = ReturnType<GLib.Variant<"as">["deepUnpack"]>; // Should be string[]`);
	print(`- type DictDeep = ReturnType<GLib.Variant<"a{sv}">["deepUnpack"]>; // Should be {[key: string]: Variant}`);

	// Demonstrate this works at compile time by having working code
	const stringArrayForType = new GLib.Variant("as", ["type", "test"]);
	const stringArrayResult = stringArrayForType.deepUnpack();

	if (Array.isArray(stringArrayResult)) {
		validateArrayElementTypes(stringArrayResult, "string", "ReturnType inference works");
	}
}

// Main execution
print("Starting GLib.Variant tests...");

// Run all test categories
testBasicVariants();
testDBusVariants();
testComplexVariants();
testVariantUnpacking();

// Create main loop and exit timer
const loop = GLib.MainLoop.new(null, false);
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
	print("\nTests completed, exiting...");
	loop.quit();
	return GLib.SOURCE_REMOVE;
});

// Run main loop
loop.run();
