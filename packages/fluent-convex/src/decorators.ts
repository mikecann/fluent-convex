import type {
  ConvexArgsValidator,
  ConvexReturnsValidator,
} from "./types";
import type { ValidatorInput, ReturnsValidatorInput } from "./zod_support";
import { isZodSchema, toConvexValidator } from "./zod_support";

// Metadata stored on decorated methods
// Using WeakMap for legacy decorator compatibility with esbuild
const methodMetadataMap = new WeakMap<object, Map<string | symbol, CallableMethodMetadata>>();

interface CallableMethodMetadata {
  inputValidator?: ConvexArgsValidator;
  inputValidatorOriginal?: ValidatorInput; // Store original for runtime validation
  returnsValidator?: ConvexReturnsValidator;
  returnsValidatorOriginal?: ReturnsValidatorInput; // Store original for runtime validation
}

// Get metadata from a method (legacy decorator support)
function getMethodMetadata(
  target: any,
  propertyKey: string | symbol,
): CallableMethodMetadata {
  const prototype = typeof target === "function" ? target.prototype : target;
  const metadataMap = methodMetadataMap.get(prototype);
  if (!metadataMap) return {};
  return metadataMap.get(propertyKey) || {};
}

// Set metadata on a method (legacy decorator support)
function setMethodMetadata(
  target: any,
  propertyKey: string | symbol,
  metadata: CallableMethodMetadata,
): void {
  const prototype = typeof target === "function" ? target.prototype : target;
  let metadataMap = methodMetadataMap.get(prototype);
  if (!metadataMap) {
    metadataMap = new Map();
    methodMetadataMap.set(prototype, metadataMap);
  }
  const existing = metadataMap.get(propertyKey) || {};
  metadataMap.set(propertyKey, { ...existing, ...metadata });
}

/**
 * Decorator to specify input validation for a callable method
 * Compatible with both legacy (esbuild) and modern decorator syntax
 */
export function input<UInput extends ValidatorInput>(
  validator: UInput,
): any {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor?: PropertyDescriptor,
  ) {
    // Handle both legacy (3 args) and modern (2 args) decorator calls
    if (descriptor === undefined) {
      // Modern decorator - get descriptor from target
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
    }

    const convexValidator = isZodSchema(validator)
      ? toConvexValidator(validator)
      : (validator as ConvexArgsValidator);

    setMethodMetadata(target, propertyKey, {
      inputValidator: convexValidator,
      inputValidatorOriginal: validator,
    });

    return descriptor;
  };
}

/**
 * Decorator to specify return validation for a callable method
 * Compatible with both legacy (esbuild) and modern decorator syntax
 */
export function returns<UReturns extends ReturnsValidatorInput>(
  validator: UReturns,
): any {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor?: PropertyDescriptor,
  ) {
    // Handle both legacy (3 args) and modern (2 args) decorator calls
    if (descriptor === undefined) {
      // Modern decorator - get descriptor from target
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
    }

    // For returns validators, we need GenericValidator, not PropertyValidators
    // If it's a Zod schema, convert it; otherwise assume it's already a GenericValidator
    const convexValidator: ConvexReturnsValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ConvexReturnsValidator)
      : (validator as ConvexReturnsValidator);

    setMethodMetadata(target, propertyKey, {
      returnsValidator: convexValidator,
      returnsValidatorOriginal: validator,
    });

    return descriptor;
  };
}

/**
 * Get metadata for a specific method
 */
export function getMetadata(
  target: any,
  propertyKey: string | symbol,
): CallableMethodMetadata {
  return getMethodMetadata(target, propertyKey);
}

/**
 * Create a proxy that automatically makes all decorated methods callable
 * Usage: const callableModel = makeCallableMethods(new MyQueryModel(context));
 * Then: await callableModel.listNumbers({ count: 10 });
 */
export function makeCallableMethods<T extends object>(instance: T): T {
  const callableMethods = new Map<
    string | symbol,
    (...args: any[]) => Promise<any>
  >();
  const prototype = Object.getPrototypeOf(instance);

  // Find all methods on the prototype and check if they have metadata
  const propertyNames = Object.getOwnPropertyNames(prototype);
  for (const propName of propertyNames) {
    if (propName !== "constructor") {
      const metadata = getMethodMetadata(prototype, propName);
      // If method has metadata, make it callable
      if (metadata.inputValidator || metadata.returnsValidator) {
        callableMethods.set(
          propName,
          makeCallable(instance, propName as keyof T),
        );
      }
    }
  }

  return new Proxy(instance, {
    get(target, prop) {
      // Return callable version if available
      if (callableMethods.has(prop)) {
        return callableMethods.get(prop);
      }
      // Otherwise return original property
      return (target as any)[prop];
    },
  });
}

/**
 * Make a method callable with validation
 * This wraps the original method to validate inputs and optionally outputs
 */
export function makeCallable<T extends object>(
  instance: T,
  methodName: keyof T,
): (...args: any[]) => Promise<any> {
  const originalMethod = (instance as any)[methodName];

  if (typeof originalMethod !== "function") {
    throw new Error(
      `Method '${String(methodName)}' is not a function on ${instance.constructor.name}`,
    );
  }

  // Get metadata from the prototype
  const prototype = Object.getPrototypeOf(instance);
  const metadata = getMethodMetadata(prototype, methodName as string | symbol);

  return async (...args: any[]) => {
    // Validate input if validator is provided
    if (metadata.inputValidatorOriginal) {
      const input = args[0] || {};
      if (isZodSchema(metadata.inputValidatorOriginal)) {
        // Use Zod's parse for runtime validation
        const parsed = metadata.inputValidatorOriginal.parse(input);
        args[0] = parsed;
      }
      // For Convex validators, we skip runtime validation
      // as they're primarily for type checking and Convex handles validation
    }

    // Call the original method
    const result = await originalMethod.apply(instance, args);

    // Validate return value if validator is provided
    if (metadata.returnsValidatorOriginal) {
      if (isZodSchema(metadata.returnsValidatorOriginal)) {
        // Use Zod's parse for runtime validation
        return metadata.returnsValidatorOriginal.parse(result);
      }
      // For Convex validators, we skip runtime validation
    }

    return result;
  };
}

