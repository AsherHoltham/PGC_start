import { Db, MongoClient, Collection, Document, Filter, InsertOneResult, DeleteResult } from 'mongodb';
import clientPromise from './mongodb'; // Ensure this exports a connected MongoClient

export class DataBase {
  private static instance: DataBase;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  
  /**
   * Private constructor to prevent direct instantiation.
   * @param dbName - The name of the MongoDB database to connect to.
   */
  private constructor(private dbName: string) {}


  /**
   * getInstance - Static method to get the single instance of the DataBase class.
   * @param dbName - The name of the MongoDB database to connect to.
   * @returns A single instance of the DataBase class.
   */
  public static getInstance(dbName: string): DataBase 
  {
    if (!DataBase.instance) {
      DataBase.instance = new DataBase(dbName);
    }
    return DataBase.instance;
  }


  /**
     * initDb - Initialize the database connection and create unique indexes.
     * @param indexes - An array of field names to create unique indexes on.
     * @param collectionName - The name of the collection to apply the indexes to.
     */
  public async initDb<T extends Document>( indexes: string[], collectionName: string ): Promise<Db | null> 
  {
    console.log("initDB");
    if (!this.db) {
      try {
        await this.connectDb(); // Ensure connection is awaited
        console.log(`Database "${this.dbName}" connected successfully.`);
  
        // Create indexes concurrently
        await Promise.all(
          indexes.map(field => this.createUniqueIndex<T>(field, collectionName))
        );
  
        console.log(`Indexes created successfully for collection "${collectionName}".`);
      } catch (error) {
        console.error('Error initializing database:', error);
        throw error; // Rethrow to notify calling code
      }
    } else {
      console.log(`Database "${this.dbName}" is already initialized.`);
    }
    return this.db;
  }


  /**
   * connectDb - Initialize the database connection.
   * @returns A promise that resolves when the connection is established.
   */
  private async connectDb(): Promise<void> 
  {
    if (this.client && this.db) {
      console.log(`Already connected to ${this.dbName}`);
      return;
    }
    try {
      this.client = await clientPromise;
      this.db = this.client.db(this.dbName);
      console.log(`Connected to ${this.dbName}`);
    } catch (error) {
      console.error(`Failed to connect to ${this.dbName}`, error);
      throw error; // Re-throw the error after logging
    }
  }


  /**
   * disconnectDb - Close the database connection.
   * @returns A promise that resolves when the connection is closed.
   */
  private async disconnectDb(): Promise<void> 
  {
    if (!this.client) {
      console.log('No active MongoDB connection to close.');
      return;
    }
    try {
      await this.client.close();
      console.log(`Disconnected from ${this.dbName}`);
      this.client = null;
      this.db = null;
    } catch (error) {
      console.error(`Failed to disconnect from database: ${this.dbName}`, error);
      throw error; // Re-throw the error after logging
    }
  }


  /**
   * initCollection - Initialize the database connection and create unique indexes.
   * @param indexes - An array of field names to create unique indexes on.
   * @param collectionName - The name of the collection to apply the indexes to.
   */
  public async initCollection<T extends Document>(indexes: string[], collectionName: string): Promise<Db | null> 
  {
    if(!this.db){
      await this.connectDb();
    }
    try {
      for (let i = 0; i < indexes.length; i++) {
        await this.createUniqueIndex<T>(indexes[i], collectionName);
      }
    } catch (error) {
      console.error('Error initializing Collection:', error);
      throw error;
    }
    return this.db;
  }


  /**
   * createUniqueIndex - Creates a unique index on the specified field.
   * @param fieldName - The field on which to create the unique index.
   * @param collectionName - The name of the collection to apply the index to.
   */
  private async createUniqueIndex<T extends Document>(fieldName: string, collectionName: string): Promise<void> 
  {
    try {
      const collection = this.getCollection<T>(collectionName);
      await collection.createIndex({ [fieldName]: 1 }, { unique: true });
      console.log(`Unique index created on field: "${fieldName}" in collection "${collectionName}".`);
    } catch (error: any) {
      // Check if the error is about the index already existing
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.warn(`Index on field "${fieldName}" already exists in collection "${collectionName}".`);
      } else {
        console.error(`Error creating unique index on "${fieldName}" in collection "${collectionName}":`, error);
        throw error; // Rethrow unexpected errors
      }
    }
  }


  /**
   * getCollection - Retrieves the specified collection with type safety.
   * @param collectionName - The name of the collection to retrieve.
   * @returns The MongoDB Collection instance.
   */
  private getCollection<T extends Document>(collectionName: string): Collection<T> 
  {
    if (!this.db) {
      throw new Error('Database not initialized. Call initDb() first.');
    }
    return this.db.collection<T>(collectionName);
  }


  /**
   * buildQuery - Constructs a MongoDB filter based on the field, value, and options.
   * @param field - The field name to check.
   * @param value - The value to search for in the specified field.
   * @returns A MongoDB filter object.
   */
  private buildQuery(field: string, value: any): Filter<any> 
  {
    return { [field]: value };
  }


  /**
   * documentExists - Checks if a document with the specified field value exists in the collection.
   * @param field - The field name to check.
   * @param value - The value to search for in the specified field.
   * @param collectionName - The name of the collection to search in.
   * @returns A promise that resolves to true if the document exists, false otherwise.
   */
  public async documentExists<T extends Document>(field: string, value: any, collectionName: string): Promise<boolean> 
  {
    if(!this.db){
      await this.connectDb();
    }
    try {
      const collection = this.getCollection<T>(collectionName);
      const query = this.buildQuery(field, value );
      const document = await collection.findOne(query);
      return document !== null;
    } catch (error) {
      console.error(`Error checking existence of document with ${field} = "${value}" in collection "${collectionName}":`, error);
      throw error; // Rethrow to notify calling code
    }
  }


  /**
   * addDocument - Inserts a document into the specified collection.
   * @param collectionName - The name of the collection to insert the document into.
   * @param document - The document to be inserted.
   * @returns A promise that resolves to the result of the insertion.
   */
  public async addDocument<T extends Document>( collectionName: string, document: any ): Promise<InsertOneResult<T>> 
  {
    // Ensure the database is connected
    if (!this.db) {
      await this.connectDb();
    }

    try {
      const collection = this.getCollection<T>(collectionName);
      const result: InsertOneResult<T> = await collection.insertOne(document);
      console.log(
        `Document inserted into "${collectionName}" with _id: ${result.insertedId}`
      );
      return result;
    } catch (error) {
      console.error(
        `Error inserting document into "${collectionName}":`,
        error
      );
      throw error; // Re-throw the error to notify the caller
    }
  }

  /**
   * removeAllDocuments - Removes all documents from the specified collection.
   * @param collectionName - The name of the collection to remove all documents from.
   * @returns A promise that resolves to the result of the deletion.
   */
  public async removeAllDocuments<T extends Document>( collectionName: string ): Promise<DeleteResult> 
  {
    // Ensure the database is connected
    if (!this.db) {
      await this.connectDb();
    }

    try {
      const collection = this.getCollection<T>(collectionName);
      const result: DeleteResult = await collection.deleteMany({});

      console.log(`Successfully deleted ${result.deletedCount} documents from "${collectionName}".`);
      return result;
    } catch (error) {
      console.error(`Error deleting all documents from "${collectionName}":`, error);
      throw error; // Re-throw the error to notify the caller
    }
  }
};

export default DataBase;