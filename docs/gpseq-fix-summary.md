# Gpseq vfunc_flat_map Fix - Quick Summary

## Problem
`TS2416` error: `Future.vfunc_flat_map` incompatible with `Result.vfunc_flat_map` due to wrong callback type.

## Root Cause
Generator namespace collision:
- `Result.Interface.vfunc_flat_map` uses global `FlatMapFunc` (→ `Gee.Iterator`) ❌
- Should use `Result.FlatMapFunc` (→ `Result`) ✅

## Current Fix (Working)
**Injection**: `packages/lib/src/injections/gpseq.ts`
- Manually replaces wrong callback types with correct `ModuleTypeIdentifier`
- Added to injection registry in `packages/lib/src/injections/inject.ts`

## Files Changed
- `packages/lib/src/injections/gpseq.ts` - NEW injection
- `packages/lib/src/injections/inject.ts` - Registry update  
- `packages/lib/src/gir-module.ts` - Improved callback matching

## Test
```bash
yarn workspace @ts-for-gir-test/types-locally run test
```
Status: ✅ PASSING

## Next Steps for Proper Fix
1. Fix `findClassCallback()` to handle compound names (`ResultFlatMapFunc` → `Result.FlatMapFunc`)
2. Improve type resolution context awareness
3. Test with other libraries for similar issues

## Key Files for Investigation
- `packages/lib/src/gir.ts` - Type resolution (`_resolve()`)
- `packages/lib/src/gir-module.ts` - Callback lookup (`findClassCallback()`)
- `packages/generator-typescript/src/module-generator.ts` - Virtual interface generation
- `girs/Gpseq-1.0.gir` - GIR source (correct as-is)

The GIR file is correct. This is a **generator limitation** with namespace collision resolution.
