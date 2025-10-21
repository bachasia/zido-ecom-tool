/**
 * API Route: Detect WordPress Table Prefix
 * 
 * POST /api/stores/detect-prefix
 * 
 * Connects to a WordPress database and automatically detects the table prefix
 * by looking for common WordPress tables.
 */

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbHost, dbUser, dbPassword, dbName } = body;

    // Validate required fields
    if (!dbHost || !dbUser || !dbPassword || !dbName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required database credentials',
          message: 'Please provide dbHost, dbUser, dbPassword, and dbName'
        },
        { status: 400 }
      );
    }

    // Connect to database
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        connectTimeout: 10000,
      });

      // Test connection
      await connection.ping();

      // Query for WordPress tables
      // Look for common WP tables: posts, users, options
      const [tables]: any = await connection.query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = ? 
         AND (
           table_name LIKE '%posts' 
           OR table_name LIKE '%users' 
           OR table_name LIKE '%options'
         ) 
         LIMIT 10`,
        [dbName]
      );

      if (!tables || tables.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No WordPress tables found',
            message: 'Could not find WordPress tables in the database. Please verify the database contains a WordPress installation.',
          },
          { status: 404 }
        );
      }

      // Extract prefix from table name
      // Common patterns: wp_posts, custom_posts, site1_posts
      const prefixes = new Set<string>();
      
      for (const row of tables) {
        const tableName = row.table_name || row.TABLE_NAME;
        
        // Try to extract prefix
        // Remove known WordPress table names to get prefix
        const match = tableName.match(/^(.+?)(posts|users|options)$/);
        if (match && match[1]) {
          prefixes.add(match[1]);
        }
      }

      // Get most common prefix (should all be the same)
      const detectedPrefixes = Array.from(prefixes);
      
      if (detectedPrefixes.length === 0) {
        // Fallback to default
        return NextResponse.json({
          success: true,
          prefix: 'wp_',
          message: 'Could not detect prefix, using default wp_',
          tables: tables.map((t: any) => t.table_name || t.TABLE_NAME),
        });
      }

      const prefix = detectedPrefixes[0];

      // Verify WooCommerce tables exist
      const [wooTables]: any = await connection.query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = ? 
         AND table_name = ?
         LIMIT 1`,
        [dbName, `${prefix}woocommerce_order_items`]
      );

      const hasWooCommerce = wooTables && wooTables.length > 0;

      return NextResponse.json({
        success: true,
        prefix,
        hasWooCommerce,
        message: `Detected prefix: ${prefix}`,
        tables: tables.map((t: any) => t.table_name || t.TABLE_NAME).slice(0, 5),
        alternativePrefixes: detectedPrefixes.slice(1),
      });

    } catch (dbError) {
      console.error('Database connection error:', dbError);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: dbError instanceof Error ? dbError.message : 'Unknown database error',
          details: dbError instanceof Error ? dbError.stack : undefined,
        },
        { status: 500 }
      );
    } finally {
      // Close connection
      if (connection) {
        try {
          await connection.end();
        } catch (closeError) {
          console.error('Error closing connection:', closeError);
        }
      }
    }

  } catch (error) {
    console.error('Detect prefix API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

