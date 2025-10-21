/**
 * WooCommerce Direct MySQL Database Connection
 * 
 * Provides connection utilities for direct WordPress/WooCommerce database access
 */

import mysql from 'mysql2/promise';

export interface WooDBStore {
  dbHost: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbPrefix?: string;
}

/**
 * Connect to WordPress/WooCommerce MySQL database
 * 
 * @param store Store object with database credentials
 * @returns MySQL connection
 */
export async function connectWooDB(store: WooDBStore): Promise<mysql.Connection> {
  if (!store.dbHost || !store.dbUser || !store.dbPassword || !store.dbName) {
    throw new Error('Database credentials are incomplete');
  }

  try {
    const connection = await mysql.createConnection({
      host: store.dbHost,
      user: store.dbUser,
      password: store.dbPassword,
      database: store.dbName,
      multipleStatements: false,
      // Connection timeout
      connectTimeout: 10000,
      // Character set
      charset: 'utf8mb4',
    });

    // Test connection
    await connection.ping();

    return connection;
  } catch (error) {
    console.error('Failed to connect to WooCommerce database:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Close database connection safely
 * 
 * @param connection MySQL connection to close
 */
export async function closeWooDB(connection: mysql.Connection): Promise<void> {
  try {
    await connection.end();
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

/**
 * Execute a query with automatic connection management
 * 
 * @param store Store with DB credentials
 * @param query SQL query
 * @param params Query parameters
 * @returns Query results
 */
export async function executeQuery<T = any>(
  store: WooDBStore,
  query: string,
  params: any[] = []
): Promise<T> {
  const connection = await connectWooDB(store);
  
  try {
    const [results] = await connection.execute(query, params);
    return results as T;
  } finally {
    await closeWooDB(connection);
  }
}

