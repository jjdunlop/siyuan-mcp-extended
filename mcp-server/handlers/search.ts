/**
 * Search tool handlers
 */

import { BaseToolHandler } from './base.js';
import type { ExecutionContext, JSONSchema } from '../core/types.js';
import type { Block, SearchResultResponse } from '../../src/types/index.js';

/**
 * Unified search: supports content, tag, filename, and combined filters
 */
export class UnifiedSearchHandler extends BaseToolHandler<
  {
    content?: string;
    tag?: string;
    filename?: string;
    limit?: number;
    notebook_id?: string;
    types?: string[];
  },
  SearchResultResponse[]
> {
  readonly name = 'unified_search';
  readonly description =
    'Search notes in SiYuan by content keywords, tags, note titles, or combined filters. Returns matching notes and blocks. TIP: When looking for a specific document, use the filename parameter or add types: ["d"] to filter to documents only — otherwise results will include individual paragraphs, list items, etc.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Optional: Content keyword to search for',
      },
      tag: {
        type: 'string',
        description: 'Optional: Tag to filter by (without # symbol, e.g., "project")',
      },
      filename: {
        type: 'string',
        description: 'Optional: Note title keyword to search for',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10)',
        default: 10,
      },
      notebook_id: {
        type: 'string',
        description: 'Optional: Limit to specific notebook ID',
      },
      types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: Block types to search (e.g., ["d"] for documents)',
      },
    },
  };

  async execute(args: any, context: ExecutionContext): Promise<SearchResultResponse[]> {
    return await context.siyuan.search.search({
      content: args.content,
      tag: args.tag,
      filename: args.filename,
      limit: args.limit || 10,
      notebook: args.notebook_id,
      types: args.types,
    });
  }
}

/**
 * Execute a raw SQL query against the SiYuan database
 */
export class ExecuteSqlHandler extends BaseToolHandler<
  { sql: string },
  Block[]
> {
  readonly name = 'execute_sql';
  readonly description =
    'Execute a raw SQL query against the SiYuan database. The main table is "blocks" with columns: id, parent_id, root_id, box, path, hpath, name, alias, memo, tag, content, type, subtype, ial, sort, created, updated. Block types: d=document, h=heading, p=paragraph, l=list, i=list-item, c=code, m=math, t=table, b=blockquote, s=super-block.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description:
          'SQL query to execute (e.g. "SELECT * FROM blocks WHERE type=\'d\' LIMIT 10")',
      },
    },
    required: ['sql'],
  };

  async execute(args: any, context: ExecutionContext): Promise<Block[]> {
    return await context.siyuan.search.query(args.sql);
  }
}

/**
 * Find blocks within a specific document by content
 */
export class FindBlockInDocumentHandler extends BaseToolHandler<
  { document_id: string; query: string; types?: string[] },
  Array<{ id: string; type: string; content: string }>
> {
  readonly name = 'find_block_in_document';
  readonly description =
    'Search for blocks within a specific document by content keyword. Faster than loading the full document when you need to find a particular paragraph, heading, or list within a known note.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The document ID (root_id) to search within',
      },
      query: {
        type: 'string',
        description: 'Content keyword to search for within the document',
      },
      types: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional: Block types to filter (e.g. ["h"] for headings only, ["p"] for paragraphs). Omit to search all types.',
      },
    },
    required: ['document_id', 'query'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<Array<{ id: string; type: string; content: string }>> {
    let sql = `SELECT id, type, content FROM blocks WHERE root_id = '${args.document_id}' AND content LIKE '%${args.query.replace(/'/g, "''")}%'`;
    if (args.types && args.types.length > 0) {
      const typeList = args.types
        .map((t: string) => `'${t.replace(/'/g, "''")}'`)
        .join(',');
      sql += ` AND type IN (${typeList})`;
    }
    sql += ' LIMIT 20';
    const results = await context.siyuan.search.query(sql);
    return results.map((b) => ({
      id: b.id,
      type: b.type,
      content: b.content,
    }));
  }
}
