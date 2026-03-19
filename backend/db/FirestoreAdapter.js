const crypto = require('crypto');

class DocumentSnapshot {
  constructor(id, doc) {
    this.id = id;
    this.exists = !!doc;
    this._data = doc;
  }
  
  data() {
    return this._data;
  }
}

class QuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }
  
  forEach(cb) {
    this.docs.forEach(docSnap => cb(docSnap));
  }
}

class DocumentReference {
  constructor(db, collectionName, id) {
    this.db = db;
    this.collectionName = collectionName;
    this.id = id || crypto.randomUUID();
  }

  async get() {
    try {
      const doc = await this.db.collection(this.collectionName).findOne({
        $or: [{ id: this.id }, { uid: this.id }, { _id: this.id }]
      });
      return new DocumentSnapshot(this.id, doc);
    } catch (error) {
      console.error(`❌ [Adapter] get error on ${this.collectionName}/${this.id}:`, error.message);
      throw error;
    }
  }

  async set(data, options = {}) {
    const dataToSave = { ...data };
    if (!dataToSave.id && !dataToSave.uid) {
      dataToSave.id = this.id;
    }

    try {
      if (options.merge) {
        await this.db.collection(this.collectionName).updateOne(
          { $or: [{ id: this.id }, { uid: this.id }] },
          { $set: dataToSave },
          { upsert: true }
        );
      } else {
        await this.db.collection(this.collectionName).replaceOne(
          { $or: [{ id: this.id }, { uid: this.id }] },
          dataToSave,
          { upsert: true }
        );
      }
    } catch (error) {
      console.error(`❌ [Adapter] set error on ${this.collectionName}/${this.id}:`, error.message);
      throw error;
    }
  }

  async update(data) {
    try {
      await this.db.collection(this.collectionName).updateOne(
        { $or: [{ id: this.id }, { uid: this.id }] },
        { $set: data }
      );
    } catch (error) {
      console.error(`❌ [Adapter] update error on ${this.collectionName}/${this.id}:`, error.message);
      throw error;
    }
  }

  async delete() {
    try {
      await this.db.collection(this.collectionName).deleteOne({
        $or: [{ id: this.id }, { uid: this.id }]
      });
    } catch (error) {
      console.error(`❌ [Adapter] delete error on ${this.collectionName}/${this.id}:`, error.message);
      throw error;
    }
  }
}

const OPERATOR_MAP = {
  '==': '$eq',
  '>': '$gt',
  '<': '$lt',
  '>=': '$gte',
  '<=': '$lte',
  'array-contains': '$in',
  'in': '$in'
};

class CollectionReference {
  constructor(db, collectionName) {
    this.db = db;
    this.collectionName = collectionName;
    this._queries = [];
    this._sorts = {};
    this._lim = 0;
  }

  doc(id) {
    return new DocumentReference(this.db, this.collectionName, id);
  }

  where(field, operator, value) {
    const newRef = this._clone();
    const mongoOp = OPERATOR_MAP[operator] || '$eq';

    let expr = {};
    if (operator === 'array-contains') {
      expr[mongoOp] = Array.isArray(value) ? value : [value];
    } else {
      expr[mongoOp] = value;
    }

    newRef._queries.push({ field, expr });
    return newRef;
  }

  orderBy(field, direction = 'asc') {
    const newRef = this._clone();
    newRef._sorts[field] = direction === 'desc' ? -1 : 1;
    return newRef;
  }

  limit(num) {
    const newRef = this._clone();
    newRef._lim = num;
    return newRef;
  }

  _clone() {
    const clone = new CollectionReference(this.db, this.collectionName);
    clone._queries = [...this._queries];
    clone._sorts = { ...this._sorts };
    clone._lim = this._lim;
    return clone;
  }

  async get() {
    try {
      const filter = {};
      this._queries.forEach(q => {
        if (!filter[q.field]) filter[q.field] = {};
        Object.assign(filter[q.field], q.expr);
      });

      let cursor = this.db.collection(this.collectionName).find(filter);

      if (Object.keys(this._sorts).length > 0) {
        cursor = cursor.sort(this._sorts);
      }
      
      if (this._lim > 0) {
        cursor = cursor.limit(this._lim);
      }

      const rawDocs = await cursor.toArray();
      const docs = rawDocs.map(doc => {
        const id = doc.id || doc.uid || doc._id.toString();
        // Remove Mongo _id before returning to simulate pure Firebase format
        if (doc._id) delete doc._id;
        return new DocumentSnapshot(id, doc);
      });

      return new QuerySnapshot(docs);
    } catch (error) {
      console.error(`❌ [Adapter] get query error on ${this.collectionName}:`, error.message);
      throw error;
    }
  }
}

class WriteBatch {
  constructor(db) {
    this.db = db;
    this.operations = [];
  }

  set(docRef, data, options = {}) {
    this.operations.push({ type: 'set', docRef, data, options });
    return this;
  }

  update(docRef, data) {
    this.operations.push({ type: 'update', docRef, data });
    return this;
  }

  delete(docRef) {
    this.operations.push({ type: 'delete', docRef });
    return this;
  }

  async commit() {
    try {
      // Group by collection logic since bulkWrite operates per-collection in MongoDB
      const byCollection = {};
      
      for (const op of this.operations) {
        const colName = op.docRef.collectionName;
        if (!byCollection[colName]) byCollection[colName] = [];
        byCollection[colName].push(op);
      }

      for (const [colName, ops] of Object.entries(byCollection)) {
        const bulkOps = ops.map(op => {
          const id = op.docRef.id;
          if (op.type === 'set') {
            const dataToSave = { ...op.data };
            if (!dataToSave.id && !dataToSave.uid) dataToSave.id = id;
            if (op.options && op.options.merge) {
              return { updateOne: { filter: { $or: [{ id }, { uid: id }] }, update: { $set: dataToSave }, upsert: true } };
            } else {
              return { replaceOne: { filter: { $or: [{ id }, { uid: id }] }, replacement: dataToSave, upsert: true } };
            }
          } else if (op.type === 'update') {
            return { updateOne: { filter: { $or: [{ id }, { uid: id }] }, update: { $set: op.data } } };
          } else if (op.type === 'delete') {
            return { deleteOne: { filter: { $or: [{ id }, { uid: id }] } } };
          }
        });

        if (bulkOps.length > 0) {
          await this.db.collection(colName).bulkWrite(bulkOps);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`❌ [Adapter] batch commit error:`, error.message);
      throw error;
    }
  }
}

class FakeTransaction {
  constructor(db) {
    this.db = db;
  }
  
  async get(docRef) {
    return await docRef.get();
  }
  
  set(docRef, data, options) {
    return docRef.set(data, options);
  }
  
  update(docRef, data) {
    return docRef.update(data);
  }
  
  delete(docRef) {
    return docRef.delete();
  }
}

class FirestoreAdapter {
  constructor(mongoDb) {
    if (!mongoDb) throw new Error('MongoDB database instance is required to initialize FirestoreAdapter.');
    this.db = mongoDb;
  }

  collection(name) {
    return new CollectionReference(this.db, name);
  }

  batch() {
    return new WriteBatch(this.db);
  }

  async runTransaction(callback) {
    // Note: standalone mongo doesn't support generic multi-document transactions elegantly
    // We execute synchronously which covers base level consistency mapping.
    try {
      const ft = new FakeTransaction(this.db);
      return await callback(ft);
    } catch (error) {
      console.error(`❌ [Adapter] transaction error:`, error.message);
      throw error;
    }
  }
}

module.exports = FirestoreAdapter;
