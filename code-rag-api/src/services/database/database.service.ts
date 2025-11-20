import { Injectable } from '@nestjs/common';
import type { DatabaseDataSourceConfig } from '../../modules/datasources/interfaces/datasource-config.interface';
import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { MongoClient, Db, type IndexDescription } from 'mongodb';

export interface TableInfo {
  name: string;
  schema?: string;
  columns: ColumnInfo[];
  indexes?: IndexInfo[];
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface TableSample {
  tableName: string;
  sampleData: unknown[];
  rowCount: number;
}

@Injectable()
export class DatabaseService {
  /**
   * 测试数据库连接
   */
  async testConnection(
    config: DatabaseDataSourceConfig,
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (config.type) {
        case 'mysql':
          return await this.testMySQLConnection(config);
        case 'postgresql':
          return await this.testPostgreSQLConnection(config);
        case 'mongodb':
          return await this.testMongoDBConnection(config);
        default:
          return {
            success: false,
            message: `Unsupported database type: ${config.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Database connection test failed',
      };
    }
  }

  /**
   * 获取表列表
   */
  async getTables(
    config: DatabaseDataSourceConfig,
  ): Promise<string[]> {
    switch (config.type) {
      case 'mysql':
        return await this.getMySQLTables(config);
      case 'postgresql':
        return await this.getPostgreSQLTables(config);
      case 'mongodb':
        return await this.getMongoDBCollections(config);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  /**
   * 获取表结构
   */
  async getTableStructure(
    config: DatabaseDataSourceConfig,
    tableName: string,
  ): Promise<TableInfo> {
    switch (config.type) {
      case 'mysql':
        return await this.getMySQLTableStructure(config, tableName);
      case 'postgresql':
        return await this.getPostgreSQLTableStructure(config, tableName);
      case 'mongodb':
        return await this.getMongoDBCollectionStructure(config, tableName);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  /**
   * 获取表数据样本
   */
  async getTableSample(
    config: DatabaseDataSourceConfig,
    tableName: string,
    limit: number = 10,
  ): Promise<TableSample> {
    switch (config.type) {
      case 'mysql':
        return await this.getMySQLTableSample(config, tableName, limit);
      case 'postgresql':
        return await this.getPostgreSQLTableSample(config, tableName, limit);
      case 'mongodb':
        return await this.getMongoDBCollectionSample(config, tableName, limit);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  /**
   * 生成 CREATE TABLE 语句
   */
  async generateCreateTableStatement(
    config: DatabaseDataSourceConfig,
    tableName: string,
  ): Promise<string> {
    const tableInfo = await this.getTableStructure(config, tableName);
    return this.formatCreateTableStatement(tableInfo, config.type);
  }

  // ========== MySQL 实现 ==========

  private async testMySQLConnection(
    config: DatabaseDataSourceConfig,
  ): Promise<{ success: boolean; message: string }> {
    const connection = await mysql.createConnection(config.connectionString);
    try {
      await connection.ping();
      await connection.end();
      return {
        success: true,
        message: 'MySQL connection test passed',
      };
    } catch (error) {
      await connection.end().catch(() => {
        // Ignore close errors
      });
      throw error;
    }
  }

  private async getMySQLTables(
    config: DatabaseDataSourceConfig,
  ): Promise<string[]> {
    const connection = await mysql.createConnection(config.connectionString);
    try {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT TABLE_NAME 
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME`,
      );
      return rows.map((row) => row.TABLE_NAME as string);
    } finally {
      await connection.end();
    }
  }

  private async getMySQLTableStructure(
    config: DatabaseDataSourceConfig,
    tableName: string,
  ): Promise<TableInfo> {
    const connection = await mysql.createConnection(config.connectionString);
    try {
      // 获取表注释
      const [tableRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT TABLE_COMMENT 
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ?`,
        [tableName],
      );

      // 获取字段信息
      const [columnRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT 
           COLUMN_NAME,
           DATA_TYPE,
           COLUMN_TYPE,
           IS_NULLABLE,
           COLUMN_DEFAULT,
           COLUMN_COMMENT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [tableName],
      );

      // 获取索引信息
      const [indexRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT 
           INDEX_NAME,
           COLUMN_NAME,
           NON_UNIQUE
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
        [tableName],
      );

      const columns: ColumnInfo[] = columnRows.map((row) => ({
        name: row.COLUMN_NAME as string,
        type: row.COLUMN_TYPE as string,
        nullable: row.IS_NULLABLE === 'YES',
        defaultValue: row.COLUMN_DEFAULT as string | undefined,
        comment: row.COLUMN_COMMENT as string | undefined,
      }));

      // 处理索引信息
      const indexMap = new Map<string, IndexInfo>();
      for (const row of indexRows) {
        const indexName = row.INDEX_NAME as string;
        if (indexName === 'PRIMARY') {
          continue; // 跳过主键索引
        }
        if (!indexMap.has(indexName)) {
          indexMap.set(indexName, {
            name: indexName,
            columns: [],
            unique: row.NON_UNIQUE === 0,
          });
        }
        indexMap.get(indexName)?.columns.push(row.COLUMN_NAME as string);
      }

      return {
        name: tableName,
        columns,
        indexes: Array.from(indexMap.values()),
        comment: tableRows[0]?.TABLE_COMMENT as string | undefined,
      };
    } finally {
      await connection.end();
    }
  }

  private async getMySQLTableSample(
    config: DatabaseDataSourceConfig,
    tableName: string,
    limit: number,
  ): Promise<TableSample> {
    const connection = await mysql.createConnection(config.connectionString);
    try {
      // 获取总行数
      const [countRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM ??`,
        [tableName],
      );
      const rowCount = countRows[0]?.count as number;

      // 获取样本数据
      const [sampleRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT * FROM ?? LIMIT ?`,
        [tableName, limit],
      );

      // 过滤敏感字段
      const filteredData = this.filterSensitiveFields(sampleRows);

      return {
        tableName,
        sampleData: filteredData,
        rowCount,
      };
    } finally {
      await connection.end();
    }
  }

  // ========== PostgreSQL 实现 ==========

  private async testPostgreSQLConnection(
    config: DatabaseDataSourceConfig,
  ): Promise<{ success: boolean; message: string }> {
    const client = new PgClient({ connectionString: config.connectionString });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return {
        success: true,
        message: 'PostgreSQL connection test passed',
      };
    } catch (error) {
      await client.end().catch(() => {
        // Ignore close errors
      });
      throw error;
    }
  }

  private async getPostgreSQLTables(
    config: DatabaseDataSourceConfig,
  ): Promise<string[]> {
    const client = new PgClient({ connectionString: config.connectionString });
    try {
      await client.connect();
      const result = await client.query<{ tablename: string }>(
        `SELECT tablename 
         FROM pg_catalog.pg_tables 
         WHERE schemaname = 'public'
         ORDER BY tablename`,
      );
      return result.rows.map((row) => row.tablename);
    } finally {
      await client.end();
    }
  }

  private async getPostgreSQLTableStructure(
    config: DatabaseDataSourceConfig,
    tableName: string,
  ): Promise<TableInfo> {
    const client = new PgClient({ connectionString: config.connectionString });
    try {
      await client.connect();

      // 获取字段信息
      const columnResult = await client.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
        description: string | null;
      }>(
        `SELECT 
           a.attname AS column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
           CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
           pg_catalog.pg_get_expr(adef.adbin, adef.adrelid) AS column_default,
           d.description
         FROM pg_catalog.pg_attribute a
         LEFT JOIN pg_catalog.pg_attrdef adef ON a.attrelid = adef.adrelid AND a.attnum = adef.adnum
         LEFT JOIN pg_catalog.pg_description d ON a.attrelid = d.objoid AND a.attnum = d.objsubid
         WHERE a.attrelid = '${tableName}'::regclass
         AND a.attnum > 0
         AND NOT a.attisdropped
         ORDER BY a.attnum`,
      );

      // 获取索引信息
      const indexResult = await client.query<{
        indexname: string;
        indexdef: string;
      }>(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = $1
         AND indexname NOT LIKE '%_pkey'`,
        [tableName],
      );

      const columns: ColumnInfo[] = columnResult.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default || undefined,
        comment: row.description || undefined,
      }));

      // 解析索引信息
      const indexes: IndexInfo[] = indexResult.rows.map((row) => {
        const match = row.indexdef.match(/\(([^)]+)\)/);
        const columns = match
          ? match[1].split(',').map((col) => col.trim().replace(/"/g, ''))
          : [];
        return {
          name: row.indexname,
          columns,
          unique: row.indexdef.includes('UNIQUE'),
        };
      });

      return {
        name: tableName,
        columns,
        indexes,
      };
    } finally {
      await client.end();
    }
  }

  private async getPostgreSQLTableSample(
    config: DatabaseDataSourceConfig,
    tableName: string,
    limit: number,
  ): Promise<TableSample> {
    const client = new PgClient({ connectionString: config.connectionString });
    try {
      await client.connect();

      // 获取总行数
      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );
      const rowCount = parseInt(countResult.rows[0]?.count || '0', 10);

      // 获取样本数据
      const sampleResult = await client.query(
        `SELECT * FROM ${tableName} LIMIT $1`,
        [limit],
      );

      // 过滤敏感字段
      const filteredData = this.filterSensitiveFields(sampleResult.rows);

      return {
        tableName,
        sampleData: filteredData,
        rowCount,
      };
    } finally {
      await client.end();
    }
  }

  // ========== MongoDB 实现 ==========

  private async testMongoDBConnection(
    config: DatabaseDataSourceConfig,
  ): Promise<{ success: boolean; message: string }> {
    const client = new MongoClient(config.connectionString);
    try {
      await client.connect();
      await client.db().admin().ping();
      await client.close();
      return {
        success: true,
        message: 'MongoDB connection test passed',
      };
    } catch (error) {
      await client.close().catch(() => {
        // Ignore close errors
      });
      throw error;
    }
  }

  private async getMongoDBCollections(
    config: DatabaseDataSourceConfig,
  ): Promise<string[]> {
    const client = new MongoClient(config.connectionString);
    try {
      await client.connect();
      const db = client.db();
      const collections = await db.listCollections().toArray();
      return collections.map((col) => col.name);
    } finally {
      await client.close();
    }
  }

  private async getMongoDBCollectionStructure(
    config: DatabaseDataSourceConfig,
    collectionName: string,
  ): Promise<TableInfo> {
    const client = new MongoClient(config.connectionString);
    try {
      await client.connect();
      const db = client.db();
      const collection = db.collection(collectionName);

      // 获取样本数据来推断结构
      const sample = await collection.findOne({});
      const columns: ColumnInfo[] = [];

      if (sample) {
        for (const [key, value] of Object.entries(sample)) {
          columns.push({
            name: key,
            type: this.inferMongoDBType(value),
            nullable: true, // MongoDB 字段都是可选的
          });
        }
      }

      // 获取索引信息
      const indexes = await collection.indexes();
      const indexInfos: IndexInfo[] = indexes
        .filter((idx: IndexDescription) => idx.name !== '_id_')
        .map((idx: IndexDescription): IndexInfo => ({
          name: idx.name || '',
          columns: Object.keys(idx.key || {}),
          unique: idx.unique === true,
        }));

      return {
        name: collectionName,
        columns,
        indexes: indexInfos,
      };
    } finally {
      await client.close();
    }
  }

  private async getMongoDBCollectionSample(
    config: DatabaseDataSourceConfig,
    collectionName: string,
    limit: number,
  ): Promise<TableSample> {
    const client = new MongoClient(config.connectionString);
    try {
      await client.connect();
      const db = client.db();
      const collection = db.collection(collectionName);

      // 获取总文档数
      const rowCount = await collection.countDocuments();

      // 获取样本数据
      const sampleData = await collection.find({}).limit(limit).toArray();

      // 过滤敏感字段
      const filteredData = this.filterSensitiveFields(sampleData);

      return {
        tableName: collectionName,
        sampleData: filteredData,
        rowCount,
      };
    } finally {
      await client.close();
    }
  }

  // ========== 辅助方法 ==========

  private inferMongoDBType(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value instanceof Date) {
      return 'date';
    }
    if (typeof value === 'object') {
      return 'object';
    }
    return typeof value;
  }

  private filterSensitiveFields(data: unknown[]): unknown[] {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /api[_-]?key/i,
      /access[_-]?token/i,
      /refresh[_-]?token/i,
      /auth[_-]?token/i,
    ];

    return data.map((row) => {
      if (typeof row !== 'object' || row === null) {
        return row;
      }

      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const isSensitive = sensitivePatterns.some((pattern) =>
          pattern.test(key),
        );
        if (isSensitive) {
          filtered[key] = '***REDACTED***';
        } else {
          filtered[key] = value;
        }
      }
      return filtered;
    });
  }

  private formatCreateTableStatement(
    tableInfo: TableInfo,
    dbType: 'mysql' | 'postgresql' | 'mongodb',
  ): string {
    if (dbType === 'mongodb') {
      // MongoDB 没有 CREATE TABLE 语句，返回集合结构描述
      const columns = tableInfo.columns
        .map((col) => `  ${col.name}: ${col.type}${col.nullable ? ' (optional)' : ''}`)
        .join('\n');
      return `Collection: ${tableInfo.name}\n${columns}`;
    }

    const lines: string[] = [];
    lines.push(`CREATE TABLE ${tableInfo.name} (`);

    const columnDefs = tableInfo.columns.map((col) => {
      let def = `  ${col.name} ${col.type}`;
      if (!col.nullable) {
        def += ' NOT NULL';
      }
      if (col.defaultValue) {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      if (col.comment) {
        def += ` COMMENT '${col.comment.replace(/'/g, "''")}'`;
      }
      return def;
    });

    lines.push(columnDefs.join(',\n'));
    lines.push(');');

    if (tableInfo.comment) {
      lines.push(`COMMENT ON TABLE ${tableInfo.name} IS '${tableInfo.comment.replace(/'/g, "''")}';`);
    }

    if (tableInfo.indexes && tableInfo.indexes.length > 0) {
      lines.push('');
      for (const index of tableInfo.indexes) {
        const unique = index.unique ? 'UNIQUE ' : '';
        const columns = index.columns.join(', ');
        lines.push(`CREATE ${unique}INDEX ${index.name} ON ${tableInfo.name} (${columns});`);
      }
    }

    return lines.join('\n');
  }
}

