# Gpseq vfunc_flat_map Namespace Collision Analysis

## Problem Summary

**Issue**: TypeScript compilation error `TS2416` in generated types for Gpseq library:
```
Property 'vfunc_flat_map' in type 'Future' is not assignable to the same property in base type 'Result'.
Types of parameters 'func' and 'func' are incompatible.
Type 'Result' is missing the following properties from type 'Iterator': valid, read_only, readOnly, next, and 9 more.
```

**Error Location**: `tests/types-locally/@types/gpseq-1.0.d.ts:2155`

**Root Cause**: Namespace collision in TypeScript generator between:
- Global `FlatMapFunc` (returns `Gee.Iterator`) 
- `Result.FlatMapFunc` (returns `Result`)

## Technical Analysis

### GIR File Structure (Correct)

The GIR file `girs/Gpseq-1.0.gir` is correctly structured:

```xml
<!-- Line 5670: Result.FlatMapFunc definition -->
<callback name="FlatMapFunc" c:type="GpseqResultFlatMapFunc">
    <return-value transfer-ownership="full">
        <type name="Gpseq.Result" c:type="GpseqResult*">
            <type name="gpointer" c:type="gpointer"/>
        </type>
    </return-value>
    <!-- ... parameters ... -->
</callback>

<!-- Line 5354: Virtual method correctly references Gpseq.ResultFlatMapFunc -->
<parameter name="func" transfer-ownership="none" closure="4" scope="notified" destroy="5">
    <type name="Gpseq.ResultFlatMapFunc" c:type="GpseqResultFlatMapFunc"/>
</parameter>

<!-- Line 6709: Global FlatMapFunc (different callback) -->
<callback name="FlatMapFunc" c:type="GpseqFlatMapFunc" throws="1">
    <return-value transfer-ownership="full">
        <type name="Gee.Iterator" c:type="GeeIterator*">
            <type name="gpointer" c:type="gpointer"/>
        </type>
    </return-value>
    <!-- ... parameters ... -->
</callback>
```

### Generator Issue

**Problem in Type Resolution**:
1. `Gpseq.ResultFlatMapFunc` is parsed correctly from GIR
2. Generator tries to resolve `ResultFlatMapFunc` but fails to find it
3. Falls back to searching for `FlatMapFunc` 
4. `findClassCallback()` finds the **global** `FlatMapFunc` (wrong one)
5. Global `FlatMapFunc` returns `Gee.Iterator` instead of `Result`

**Generated Output (Before Fix)**:
```typescript
// Result.Interface - WRONG
vfunc_flat_map(a_type: GObject.GType, a_dup_func: GObject.BoxedCopyFunc, func: FlatMapFunc): Result;
//                                                                              ^^^^^^^^^^^
//                                                                              Global FlatMapFunc -> Gee.Iterator

// Should be:
vfunc_flat_map(a_type: GObject.GType, a_dup_func: GObject.BoxedCopyFunc, func: Result.FlatMapFunc): Result;
//                                                                              ^^^^^^^^^^^^^^^^^^^
//                                                                              Result.FlatMapFunc -> Result
```

### Inheritance Chain Analysis

```
Future (class) 
  └── implements Result (interface)
      └── extends Result.Interface (virtual interface)
          └── vfunc_flat_map(func: FlatMapFunc) <- WRONG TYPE
```

**Conflict**: 
- `Future.vfunc_flat_map` expects `func: FlatMapFunc` (global, returns Iterator)
- `Result.vfunc_flat_map` expects `func: Result.FlatMapFunc` (specific, returns Result)

## Current Solution (Temporary Fix)

### Injection-Based Fix

**File**: `packages/lib/src/injections/gpseq.ts`

```typescript
export default {
    namespace: "Gpseq",
    version: "1.0",
    modifier(namespace: IntrospectedNamespace) {
        const Result = namespace.getClass("Result") as IntrospectedInterface | null;
        if (!Result) return;

        // Fix vfunc_flat_map
        const resultVirtualMethods = Result.members.filter((m) => m.name === "vfunc_flat_map");
        for (const vfunc of resultVirtualMethods) {
            const funcParam = vfunc.parameters.find((p) => p.name === "func");
            if (funcParam) {
                const resultFlatMapFunc = new ModuleTypeIdentifier("FlatMapFunc", "Result", "Gpseq");
                Object.defineProperty(funcParam, "type", {
                    value: resultFlatMapFunc,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
            }
        }

        // Fix vfunc_map (same issue)
        const resultMapMethods = Result.members.filter((m) => m.name === "vfunc_map");
        // ... similar fix for MapFunc
    },
};
```

**Result**: Successfully generates correct TypeScript:
```typescript
vfunc_flat_map(a_type: GObject.GType, a_dup_func: GObject.BoxedCopyFunc, func: Result.FlatMapFunc): Result;
vfunc_map(a_type: GObject.GType, a_dup_func: GObject.BoxedCopyFunc, func: Result.MapFunc): Result;
```

## Files Modified

### Core Changes
- `packages/lib/src/injections/gpseq.ts` - **NEW**: Injection to fix namespace collision
- `packages/lib/src/injections/inject.ts` - Added gpseq injection to registry
- `packages/lib/src/gir-module.ts` - Improved `findClassCallback()` to prefer specific matches

### Test Files
- `tests/types-locally/@types/gpseq-1.0.d.ts` - Generated output (now correct)

## Potential Proper Solutions

### 1. Fix Generator Type Resolution

**Target**: `packages/lib/src/gir.ts` - `TypeIdentifier._resolve()` method

**Issue**: Line 139 `findClassCallback(name)` doesn't distinguish between:
- Global callbacks (e.g., `FlatMapFunc` -> `Gee.Iterator`)
- Class-specific callbacks (e.g., `Result.FlatMapFunc` -> `Result`)

**Potential Fix**: Improve callback resolution to:
1. Check for exact namespace matches first (`Gpseq.ResultFlatMapFunc` -> `Result.FlatMapFunc`)
2. Only fall back to global callbacks if no class-specific match found
3. Consider the c:type mapping (`GpseqResultFlatMapFunc` should map to `Result.FlatMapFunc`)

### 2. Enhance findClassCallback Logic

**Target**: `packages/lib/src/gir-module.ts` - `findClassCallback()` method

**Current Issue**: Returns first match without considering specificity

**Improvement Made**: Sort matches by specificity (longer class names preferred)

**Further Enhancement Needed**: 
- Consider c:type mappings
- Prefer exact namespace matches
- Handle compound type names (`ResultFlatMapFunc` should match `Result.FlatMapFunc`)

### 3. Virtual Interface Generation Fix

**Target**: `packages/generator-typescript/src/module-generator.ts` - `generateVirtualInterface()` method

**Issue**: Virtual interface generation doesn't properly resolve callback types within class context

**Potential Fix**: Ensure callback type resolution considers the containing class context

## Test Validation

**Test Command**: `yarn workspace @ts-for-gir-test/types-locally run test`

**Success Criteria**:
- No `TS2416` errors
- Generated types use `Result.FlatMapFunc` and `Result.MapFunc`
- TypeScript compilation passes

**Current Status**: ✅ PASSING with injection-based fix

## Related Systems

### Existing Conflict Resolution
- `packages/lib/src/utils/conflicts.ts` - Handles vfunc signature conflicts
- `hasVfuncSignatureConflicts()` - Detects conflicts between interfaces
- **Note**: This system works for signature conflicts, not namespace collisions

### Type Resolution Chain
1. `TypeIdentifier._resolve()` - Main type resolution entry point
2. `findClassCallback()` - Searches for callbacks in classes  
3. `resolveSymbolFromTypeName()` - C-type fallback resolution
4. `ModuleTypeIdentifier` - Represents class-scoped types

## Debugging Information

### Log Analysis
```
[TypeIdentifier] WARN: Fall back on c:type inference for Gpseq.ResultFlatMapFunc and found Gpseq.ResultFlatMapFunc
```
This shows the type resolution IS working for `Gpseq.ResultFlatMapFunc`, but somewhere in the pipeline it gets mapped to the wrong callback.

### Key Insight
The issue is NOT in the initial parsing or c:type resolution. The problem occurs in the **callback lookup phase** where `ResultFlatMapFunc` gets resolved to the global `FlatMapFunc` instead of `Result.FlatMapFunc`.

## Recommendations for Proper Fix

1. **Priority 1**: Fix `findClassCallback()` to handle compound names (`ResultFlatMapFunc` -> `Result.FlatMapFunc`)
2. **Priority 2**: Improve type resolution to consider class context for callback lookups
3. **Priority 3**: Add debug logging to trace the exact resolution path
4. **Priority 4**: Consider if this affects other libraries with similar patterns

## Testing Other Libraries

Check if similar namespace collisions exist in:
- Other GObject libraries with class-specific callbacks
- Libraries with both global and class-scoped callback types
- Virtual interface implementations

This could be a broader generator limitation affecting multiple libraries.
