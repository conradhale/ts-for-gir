# Project Memories

## TypeScript vfunc Interface Conflict Resolution - COMPLETED ✅

### Problem Solved
Successfully resolved TypeScript compilation errors caused by virtual method signature conflicts in interface inheritance chains. The issue affected interfaces like `Json.Serializable` and complex Gee interface hierarchies.

### Technical Solution Implemented
1. **Enhanced Conflict Detection System** in `packages/lib/src/utils/conflicts.ts`:
   - Added `ConflictType.VFUNC_SIGNATURE_CONFLICT = 6`
   - Implemented `checkVfuncSignatureConflicts()` for interface-to-interface conflicts
   - Extended `hasVfuncSignatureConflicts()` with exact return type comparison

2. **Modified Code Generation** in `packages/generator-typescript/src/module-generator.ts`:
   - Added conflict detection before interface inheritance decisions
   - Implemented `generateVirtualMethodOverloads()` for conflicting interfaces
   - Automatic method overload generation instead of dual inheritance

### Key Insights for Future Work
- **Interface inheritance conflicts** occur when parent interfaces already have virtual methods
- **Return type differences** (even subtype relationships) cause TypeScript compilation failures
- **Method overloads** are the correct solution for maintaining type safety
- **Automatic conflict detection** prevents future similar issues

### Testing Environment
- **Test Package**: `@ts-for-gir-test/types-locally`
- **Validation Commands**: 
  - `yarn run generate` - Regenerate types
  - `yarn run check:types` - Verify TypeScript compilation
  - `yarn run test` - Run full test suite

### Files to Remember
- `packages/lib/src/utils/conflicts.ts` - Core conflict detection logic
- `packages/generator-typescript/src/module-generator.ts` - Code generation with conflict handling
- `packages/lib/src/gir.ts` - ConflictType enum definition

---

## Previous Memories

## TypeScript vfunc Interface Conflict Problem

### Problem Description
TypeScript interfaces inheriting from both `GObject.Object` and virtual `Interface` namespaces fail compilation due to method signature conflicts:

```typescript
// ❌ FAILS - TypeScript error: "Named property 'vfunc_get_property' not identical"
interface Serializable extends GObject.Object, Serializable.Interface {
    // Conflict: GObject.Object.vfunc_get_property vs Serializable.Interface.vfunc_get_property
}
```

**Error Location:** `tests/types-locally/@types/json-1.0.d.ts:3027`
**Specific Conflict:** `vfunc_get_property` and `vfunc_set_property` have different signatures between parent interfaces

### Proven Working Solution
Manual method overloads resolve the conflict:
```typescript
// ✅ WORKS - Method overloads satisfy both parent signatures
interface Serializable extends GObject.Object {
    vfunc_get_property(property_id: number, value: GObject.Value, pspec: GObject.ParamSpec): void;
    vfunc_get_property(pspec: GObject.ParamSpec): unknown;
    vfunc_set_property(property_id: number, value: GObject.Value, pspec: GObject.ParamSpec): void;
    vfunc_set_property(pspec: GObject.ParamSpec, value: GObject.Value): void;
    // All other virtual methods inherit automatically from Interface
}
```

### Technical Architecture

#### Key Files & Components:
1. **Generator:** `packages/generator-typescript/src/module-generator.ts`
   - `generateImplementationInterface()` method (line ~1443)
   - Currently adds `${girClass.name}.Interface` to inheritance
   - Needs conflict detection and method overload generation

2. **Conflict System:** `packages/lib/src/utils/conflicts.ts`
   - Existing conflict detection framework
   - `ConflictType` enum with new `VFUNC_SIGNATURE_CONFLICT = 6`
   - `filterConflicts()` function processes elements
   - `isConflictingFunction()` detects signature mismatches

3. **Type System:** `packages/lib/src/gir.ts`
   - `ConflictType` enum definition
   - `TypeConflict` class for marking conflicted elements

#### Current Conflict Detection Flow:
```
IntrospectedVirtualClassFunction[] 
  → filterConflicts(namespace, class, virtualMethods)
    → detectConflictType() for each method
      → checkVfuncSignatureConflicts() [NEEDS IMPLEMENTATION]
        → isConflictingFunction() [EXISTS - reuse]
          → Returns ConflictType.VFUNC_SIGNATURE_CONFLICT
    → createConflictElement() [NEEDS VFUNC HANDLING]
  → Generate method overloads instead of dual inheritance
```

### Implementation Strategy

#### Phase 1: Conflict Detection
1. Extend `checkVfuncSignatureConflicts()` in `conflicts.ts`:
   - Only process `IntrospectedVirtualClassFunction` on `IntrospectedInterface`
   - Use existing `isConflictingFunction()` to detect signature mismatches
   - Return `ConflictType.VFUNC_SIGNATURE_CONFLICT` for conflicts

2. Extend `createConflictElement()` in `conflicts.ts`:
   - Handle `VFUNC_SIGNATURE_CONFLICT` case
   - Mark conflicted virtual functions (avoid TypeConflict in return_type - causes resolution errors)

#### Phase 2: Code Generation
1. Modify `generateImplementationInterface()` in `module-generator.ts`:
   - Process virtual methods through `filterConflicts()`
   - Detect if any have `VFUNC_SIGNATURE_CONFLICT`
   - If conflicts exist: generate method overloads, don't inherit from Interface
   - If no conflicts: inherit from Interface as usual

2. Add method overload generation:
   - Find parent virtual methods with same name
   - Generate overloads for both parent and interface signatures
   - Add `@ignore` TSDoc tags to hide from documentation

### Testing Environment

#### Test Setup: `@ts-for-gir-test/types-locally`
- **Location:** `tests/types-locally/`
- **Purpose:** Local testing of generated types without full workspace rebuild
- **Key Files:**
  - `@types/json-1.0.d.ts` - Contains the failing Serializable interface
  - `@types/gobject-2.0.d.ts` - Contains GObject.Object with conflicting methods

#### Test Commands:
```bash
# Generate types for testing
yarn workspace @ts-for-gir-test/types-locally run generate

# Check TypeScript compilation (shows the error)
yarn workspace @ts-for-gir-test/types-locally run check:types

# Run actual tests
yarn workspace @ts-for-gir-test/types-locally run test
```

#### Success Criteria:
1. `yarn run check:types` passes without vfunc_get_property conflicts
2. Generated interfaces have method overloads instead of dual inheritance
3. Virtual interface functionality remains intact for non-conflicting cases

### Development Notes
- **Existing Infrastructure:** Conflict detection system exists and works well
- **Reuse Opportunity:** `isConflictingFunction()` already detects signature mismatches
- **Avoid:** TypeConflict in return_type causes generation errors
- **Focus:** Extend existing patterns rather than creating new systems (ID: 6618258)
- The user prefers that README.md not be modified too specifically and should remain general, as they will expand tests to cover other areas in the future. (ID: 5545954)
- The user prefers not to skip failing tests but to allow tests to fail so they can be used to identify and fix issues via tests. (ID: 5545935)
- The user prefers to always use the '.ts' extension for imports instead of '.js' across the codebase. (ID: 2395646)
- The user prefers that all imports be placed at the beginning of the file and to avoid using require, favoring ES module import syntax. (ID: 2305678)
- The user requests short English answers to code review comments. (ID: 2174391)
- The user prefers to commit code using the provided MCP tools, following the guidelines in @git-commit-best-practices.mdc. (ID: 2171610)
- The ts-for-gir project includes a GJS git submodule at ./gjs/ that contains the actual GJS runtime source code. This can be analyzed to understand the real implementation of JavaScript APIs and ensure TypeScript definitions match the runtime behavior. Key areas to examine: gjs/modules/core/overrides/GObject.js for GObject ParamSpec implementations, gjs/gi/ for GObject introspection bindings, and gjs/modules/ for other core JavaScript APIs. This helps resolve discrepancies between GIR XML definitions and actual JavaScript runtime behavior. (ID: 1315045)
