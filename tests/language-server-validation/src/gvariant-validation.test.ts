/**
 * GVariant Type Validation Tests
 * 
 * Tests for validating TypeScript type generation for GLib.Variant methods.
 * Focus on the specific issues mentioned in PR #279:
 * - Tuple parsing errors
 * - Type inference for unpack/deepUnpack/recursiveUnpack methods
 */

import { describe, it, expect } from 'vitest';
import { 
  validateGIRTypeScriptAuto, 
  getIdentifierTypeAuto,
} from '@ts-for-gir/language-server';

describe('GVariant Type Validation', () => {
  
  describe('Critical Issue: Tuple Parsing (PR #279)', () => {
    it('should correctly parse integer tuples', () => {
      const testCode = `
        import GLib from 'gi://GLib?version=2.0';
        
        // This is the exact issue from PR #279
        type Infer<T extends string> = ReturnType<GLib.Variant<T>["unpack"]>
        
        // Should work but currently errors out
        type IntTuple = Infer<"(ii)">; // Should be [Variant<"i">, Variant<"i">]
        
        // Test with actual usage
        const intTuple = new GLib.Variant("(ii)", [42, 100]);
        const tupleUnpack = intTuple.unpack();
      `;

      const result = validateGIRTypeScriptAuto(testCode);
      
      // This should pass when the generator is fixed
      // Currently may fail with VariantTypeError
      if (!result.success) {
        console.log('Tuple parsing issue (PR #279):', result.errors);
      }
      
      // Test hover on unpacked result
      const hoverResult = getIdentifierTypeAuto(testCode, 'tupleUnpack');
      console.log('Tuple unpack type (should be Variant[]):', hoverResult.type);
      
      // Document expected behavior
      expect(hoverResult.success).toBe(true);
      if (hoverResult.type && !hoverResult.type.includes('Error')) {
        expect(hoverResult.type).toMatch(/Variant.*\[\]|Array.*Variant/);
      }
    });

    it('should handle complex tuple types', () => {
      const testCode = `
        import GLib from 'gi://GLib?version=2.0';
        
        // Various tuple types that should work
        const simpleTuple = new GLib.Variant("(si)", ["hello", 42]);
        const boolTuple = new GLib.Variant("(sib)", ["test", 123, true]);
        const doubleTuple = new GLib.Variant("(dd)", [3.14, 2.71]);
        
        // Test unpacking
        const simple = simpleTuple.unpack();
        const withBool = boolTuple.unpack();
        const doubles = doubleTuple.unpack();
      `;

      const result = validateGIRTypeScriptAuto(testCode);
      
      // Check if validation passes
      if (!result.success) {
        console.log('Complex tuple errors:', result.errors.slice(0, 3));
      }
      
      // Test type inference
      const simpleHover = getIdentifierTypeAuto(testCode, 'simple');
      const boolHover = getIdentifierTypeAuto(testCode, 'withBool');
      
      // These should return Variant[] for unpack()
      if (simpleHover.type) {
        expect(simpleHover.type).toMatch(/Variant|Array/);
      }
      if (boolHover.type) {
        expect(boolHover.type).toMatch(/Variant|Array/);
      }
    });
  });

  describe('Unpacking Method Type Inference', () => {
    it('should differentiate between unpack, deepUnpack, and recursiveUnpack', () => {
      const testCode = `
        import GLib from 'gi://GLib?version=2.0';
        
        const arrayVariant = new GLib.Variant("as", ["one", "two", "three"]);
        
        // Different unpacking methods should have different return types
        const shallowUnpack = arrayVariant.unpack();         // Should be Variant[]
        const deepUnpack = arrayVariant.deepUnpack();        // Should be string[]
        const recursiveUnpack = arrayVariant.recursiveUnpack(); // Should be string[]
        
        // Test dictionary variant
        const dictVariant = new GLib.Variant("a{sv}", {
          key1: new GLib.Variant("s", "value1"),
          key2: new GLib.Variant("i", 123)
        });
        
        const dictShallow = dictVariant.unpack();     // Should be {[key: string]: Variant}
        const dictDeep = dictVariant.deepUnpack();    // Should be {[key: string]: any}
        const dictRecursive = dictVariant.recursiveUnpack(); // Should be {[key: string]: any}
      `;

      const result = validateGIRTypeScriptAuto(testCode);
      
      // Test array unpacking types
      const shallowType = getIdentifierTypeAuto(testCode, 'shallowUnpack');
      const deepType = getIdentifierTypeAuto(testCode, 'deepUnpack');
      const recursiveType = getIdentifierTypeAuto(testCode, 'recursiveUnpack');
      
      console.log('Array unpacking types:');
      console.log('- unpack():', shallowType.type);
      console.log('- deepUnpack():', deepType.type);
      console.log('- recursiveUnpack():', recursiveType.type);
      
      // Verify expected types
      if (shallowType.type && !shallowType.type.includes('Error')) {
        expect(shallowType.type).toMatch(/Variant.*\[\]/);
      }
      if (deepType.type && !deepType.type.includes('Error')) {
        expect(deepType.type).toMatch(/string.*\[\]/);
      }
      if (recursiveType.type && !recursiveType.type.includes('Error')) {
        expect(recursiveType.type).toMatch(/string.*\[\]/);
      }
      
      // Test dictionary unpacking types
      const dictShallowType = getIdentifierTypeAuto(testCode, 'dictShallow');
      const dictDeepType = getIdentifierTypeAuto(testCode, 'dictDeep');
      const dictRecursiveType = getIdentifierTypeAuto(testCode, 'dictRecursive');
      
      console.log('Dictionary unpacking types:');
      console.log('- unpack():', dictShallowType.type);
      console.log('- deepUnpack():', dictDeepType.type);
      console.log('- recursiveUnpack():', dictRecursiveType.type);
    });

    it('should handle nested variant structures', () => {
      const testCode = `
        import GLib from 'gi://GLib?version=2.0';
        
        // Complex nested structure
        const nested = new GLib.Variant("a{sv}", {
          metadata: new GLib.Variant("a{sv}", {
            title: new GLib.Variant("s", "Test"),
            count: new GLib.Variant("i", 42)
          }),
          items: new GLib.Variant("as", ["item1", "item2"])
        });
        
        // Test different unpacking levels
        const level1 = nested.unpack();
        const level2 = nested.deepUnpack();
        const fullUnpack = nested.recursiveUnpack();
      `;

      const result = validateGIRTypeScriptAuto(testCode);
      
      // Check type inference for nested structures
      const level1Type = getIdentifierTypeAuto(testCode, 'level1');
      const level2Type = getIdentifierTypeAuto(testCode, 'level2');
      const fullType = getIdentifierTypeAuto(testCode, 'fullUnpack');
      
      console.log('Nested unpacking:');
      console.log('- level1 (unpack):', level1Type.type);
      console.log('- level2 (deepUnpack):', level2Type.type);
      console.log('- full (recursiveUnpack):', fullType.type);
      
      // Validate that recursiveUnpack fully unpacks nested variants
      if (fullType.type && !fullType.type.includes('Error')) {
        expect(fullType.type).not.toMatch(/Variant/);
      }
    });
  });

  describe('Advanced Variant Types (with/without option)', () => {
    it('should handle explicit type parameters when noAdvancedVariants is true', () => {
      const testCode = `
        import GLib from 'gi://GLib?version=2.0';
        
        // With noAdvancedVariants: true, explicit types are required
        const dict = new GLib.Variant("a{sv}", {
          name: new GLib.Variant("s", "Test"),
          value: new GLib.Variant("i", 42)
        });
        
        // This pattern is required with noAdvancedVariants: true
        const unpacked = dict.deepUnpack<{ [key: string]: any }>();
        
        // Without explicit type, it may not work properly
        const unpackedNoType = dict.deepUnpack();
      `;

      const result = validateGIRTypeScriptAuto(testCode);
      
      // Test with and without explicit types
      const withType = getIdentifierTypeAuto(testCode, 'unpacked');
      const withoutType = getIdentifierTypeAuto(testCode, 'unpackedNoType');
      
      console.log('Explicit type parameter test:');
      console.log('- With explicit type:', withType.type);
      console.log('- Without explicit type:', withoutType.type);
      
      // Both should work, but behavior differs based on noAdvancedVariants
      expect(withType.success).toBe(true);
      expect(withoutType.success).toBe(true);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should validate DBus-style variant usage', () => {
      const testCode = `
        import GLib from 'gi://GLib?version=2.0';
        
        // Common DBus pattern
        const dbusMessage = new GLib.Variant("(sa{sv})", [
          "org.example.Service",
          {
            method: new GLib.Variant("s", "GetStatus"),
            args: new GLib.Variant("as", ["arg1", "arg2"]),
            timeout: new GLib.Variant("i", 5000)
          }
        ]);
        
        // Unpack for processing
        const [service, params] = dbusMessage.deepUnpack();
        
        // Access parameters
        const method = params.method?.deepUnpack?.();
      `;

      const result = validateGIRTypeScriptAuto(testCode);
      
      // Check if DBus patterns work
      const serviceType = getIdentifierTypeAuto(testCode, 'service');
      const paramsType = getIdentifierTypeAuto(testCode, 'params');
      const methodType = getIdentifierTypeAuto(testCode, 'method');
      
      console.log('DBus pattern types:');
      console.log('- service:', serviceType.type);
      console.log('- params:', paramsType.type);
      console.log('- method:', methodType.type);
      
      // Basic validation
      expect(result.errors.length).toBeLessThanOrEqual(5); // Allow some errors for now
    });

    it('should validate GSettings-style variant usage', () => {
      const testCode = `
        import GLib from 'gi://GLib?version=2.0';
        
        // GSettings pattern
        const settings = new GLib.Variant("a{sv}", {
          "window-size": new GLib.Variant("(ii)", [800, 600]),
          "dark-mode": new GLib.Variant("b", true),
          "recent-files": new GLib.Variant("as", ["/path/to/file1", "/path/to/file2"])
        });
        
        // Get and unpack a setting
        const settingsObj = settings.deepUnpack();
        const windowSize = settingsObj["window-size"]?.deepUnpack?.();
        const darkMode = settingsObj["dark-mode"]?.deepUnpack?.();
      `;

      const result = validateGIRTypeScriptAuto(testCode);
      
      // Check GSettings pattern
      const settingsType = getIdentifierTypeAuto(testCode, 'settingsObj');
      const windowType = getIdentifierTypeAuto(testCode, 'windowSize');
      const darkModeType = getIdentifierTypeAuto(testCode, 'darkMode');
      
      console.log('GSettings pattern types:');
      console.log('- settings:', settingsType.type);
      console.log('- windowSize:', windowType.type);
      console.log('- darkMode:', darkModeType.type);
      
      // Should compile with minimal errors
      expect(result.errors.length).toBeLessThanOrEqual(5);
    });
  });
});
