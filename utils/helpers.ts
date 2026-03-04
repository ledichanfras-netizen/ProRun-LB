
/**
 * Deep clones an object safely, handling circular references and undefined values.
 */
export const safeDeepClone = (obj: any): any => {
  const seen = new WeakSet();
  
  const clone = (val: any): any => {
    // Basic types
    if (val === null || typeof val !== 'object') {
      return val;
    }
    
    // Handle Dates
    if (val instanceof Date) {
      return new Date(val.getTime());
    }

    // Handle Firestore Timestamps
    if (typeof val.toDate === 'function' && 'seconds' in val) {
      return val.toDate();
    }

    // Handle circular references
    if (seen.has(val)) {
      return undefined;
    }
    
    // Add to seen early to prevent recursion even for complex objects
    seen.add(val);

    // Detect Firestore internal objects (DocumentReference, Query, etc.)
    const constructorName = val.constructor?.name;
    const isFirestoreInternal = 
      constructorName === 'DocumentReference' || 
      constructorName === 'Query' || 
      constructorName === 'Firestore' ||
      constructorName === 'CollectionReference' ||
      (val.firestore && val.id && typeof val.withConverter === 'function');

    if (isFirestoreInternal) {
      return null;
    }

    // Only process plain objects and arrays
    const proto = Object.getPrototypeOf(val);
    const isPlainObject = proto === null || proto === Object.prototype;
    const isArray = Array.isArray(val);

    if (!isPlainObject && !isArray) {
      // If it's a complex object (like a Firebase class or DOM node), 
      // try to see if it has a toJSON method, otherwise return null
      if (typeof val.toJSON === 'function') {
        try {
          const json = val.toJSON();
          if (json === val) return null;
          return clone(json);
        } catch (e) {
          return null;
        }
      }
      return null; 
    }
    
    if (isArray) {
      return val.map(item => clone(item));
    }
    
    const result: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        // Skip internal properties
        if (key.startsWith('_') || key === 'firestore' || key === 'delegate') continue;

        try {
          const clonedVal = clone(val[key]);
          if (clonedVal !== undefined) {
            result[key] = clonedVal;
          }
        } catch (e) {
          continue;
        }
      }
    }
    return result;
  };
  
  return clone(obj);
};
