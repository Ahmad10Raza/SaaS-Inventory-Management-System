import { Types } from 'mongoose';

/**
 * Ensures a value is a Mongoose ObjectId.
 * Useful for multi-tenant aggregation pipelines where auto-casting is skipped.
 */
export function ensureObjectId(id: string | Types.ObjectId | any): Types.ObjectId {
  if (!id) return id;
  if (typeof id === 'string') {
    try {
      return new Types.ObjectId(id);
    } catch (e) {
      return id as any;
    }
  }
  return id;
}
