/**
 * SiYuan MCP server core
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createSiyuanTools } from '../../src/index.js';
import type { ServerConfig, ExecutionContext, MCPTool } from './types.js';
import { DefaultToolRegistry } from './registry.js';
import { ConsoleLogger } from './logger.js';
import { createAllHandlers } from '../handlers/index.js';

const SERVER_INSTRUCTIONS = `You have access to a SiYuan Note workspace through this MCP server.

## Efficiency guidelines

- **Prefer block-level tools for targeted edits.** When you know the block ID (e.g. from a search result or SQL query), use get_block / update_block instead of fetching the entire document. This is faster and uses fewer tokens.
- **Use document-level tools when you need full context.** If you need to understand the overall structure or content of a note, get_document_content is the right choice — don't avoid it when context matters.
- **Use execute_sql for complex lookups.** The SQL tool gives direct access to the blocks table and is more flexible than unified_search for queries involving multiple conditions, sorting, or aggregation.
- **Use get_child_blocks for efficient two-step navigation.** First call get_child_blocks on the document ID to see top-level blocks (scan headings to find the right section). Then call get_child_blocks on a heading block ID to get only the blocks within that section. This avoids loading the full document when you only need one section — for a large document this can be 5-10x fewer tokens than get_document_content.
- **Use get_hpath_by_id to resolve locations.** When reporting results to the user, resolve block IDs to human-readable paths so the user knows where things are.

## Data safety

- Before bulk modifications or deletions, create a snapshot with create_snapshot.
- After making changes, verify the result by reading the content back.

## Key concepts

- Every piece of content in SiYuan is a **block** with a unique ID.
- **Documents** are top-level blocks (type='d') that contain child blocks.
- Block types: d=document, h=heading, p=paragraph, l=list, i=list-item, c=code, m=math, t=table, b=blockquote, s=super-block.
- Custom attributes (custom-* keys) can be set on any block via get_block_attrs / set_block_attrs.
`;

export class SiyuanMCPServer {
  private mcpServer: Server;
  private registry = new DefaultToolRegistry();
  private context: ExecutionContext;
  private logger = new ConsoleLogger();

  constructor(config: ServerConfig) {
    const siyuan = createSiyuanTools(config.baseUrl, config.token);

    this.context = {
      siyuan,
      config,
      logger: this.logger,
    };

    this.registerHandlers();

    this.mcpServer = new Server(
      {
        name: config.name || 'siyuan-mcp-server',
        version: config.version || '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
        instructions: SERVER_INSTRUCTIONS,
      }
    );

    this.setupRequestHandlers();
  }

  private registerHandlers(): void {
    const handlers = createAllHandlers();
    for (const handler of handlers) {
      this.registry.register(handler);
      this.logger.debug(`Registered tool: ${handler.name}`);
    }
  }

  private setupRequestHandlers(): void {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: MCPTool[] = this.registry.getAll().map((handler) => ({
        name: handler.name,
        description: handler.description,
        inputSchema: handler.inputSchema,
      }));

      this.logger.debug(`Listing ${tools.length} tools`);
      return { tools };
    });

    this.mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'siyuan-usage-guide',
            description: 'Usage guide and best practices for the SiYuan MCP server',
          },
        ],
      };
    });

    this.mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;

      if (name === 'siyuan-usage-guide') {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Please read the SiYuan MCP server usage guide.',
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: this.getUsageGuide(),
              },
            },
          ],
        };
      }

      throw new Error(`Unknown prompt: ${name}`);
    });

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.logger.info(`Tool called: ${name}`);

      try {
        const handler = this.registry.get(name);
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const result = await handler.execute(args || {}, this.context);

        let text: string;
        if (result === undefined) {
          text = 'Success';
        } else if (typeof result === 'string') {
          text = result;
        } else {
          text = JSON.stringify(result, null, 2);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool execution failed: ${errorMessage}`);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getUsageGuide(): string {
    return `# SiYuan MCP Server Usage Guide

## Overview

This MCP server provides tools for interacting with a SiYuan Note workspace, including search, document management, block-level editing, snapshots, and tag management.

## Efficiency tips

- **Prefer block-level tools for targeted edits.** When you have a block ID, use get_block / update_block instead of loading the full document. This saves tokens and is faster.
- **Use document-level tools when full context is needed.** get_document_content is the right choice when you need to understand the overall structure of a note.
- **Use execute_sql for flexible queries.** Direct SQL gives access to the blocks table for complex lookups, aggregation, and sorting.

## Data safety

1. Before bulk modifications or deletions, use create_snapshot (add a descriptive memo).
2. Perform the changes.
3. If something goes wrong, use list_snapshots then rollback_to_snapshot to restore.

## Suggested workflow

1. **Find documents** — use unified_search or execute_sql
2. **Read content** — use get_document_content (full doc) or get_block (single block)
3. **Create snapshot** — use create_snapshot before making changes
4. **Edit** — use update_block, insert_block, append_block for targeted edits, or update_document for full rewrites
5. **Verify** — re-read the content to confirm
6. **Rollback if needed** — use rollback_to_snapshot

## Tool categories

### Search & Query
- unified_search — search by content, filename, tag, or combinations
- execute_sql — raw SQL against the blocks table

### Document operations
- get_document_content, create_document, append_to_document, update_document
- rename_document, remove_document, move_documents, get_document_tree
- get_hpath_by_id — resolve a block ID to a human-readable path
- append_to_daily_note — append to today's daily note (auto-creates)

### Block operations
- get_block / update_block — read or edit a single block by ID
- append_block / insert_block — add content at a specific position
- move_block — reorder or relocate blocks
- get_block_attrs / set_block_attrs — read or write custom metadata

### Notebook, Snapshot & Tag tools
- list_notebooks, get_recently_updated_documents, create_notebook
- create_snapshot, list_snapshots, rollback_to_snapshot
- list_all_tags, batch_replace_tag

## Key concepts

- Every piece of content in SiYuan is a **block** with a unique ID (e.g. 20240101120000-abc1234).
- **Documents** are top-level blocks (type='d') containing child blocks.
- When creating documents, paths use the format /folder/document (no .md extension).
- Snapshots require the data repo feature to be enabled in SiYuan.
- Avoid concurrent modifications to the same document.
`;
  }

  getMCPServer(): Server {
    return this.mcpServer;
  }

  getRegistry(): DefaultToolRegistry {
    return this.registry;
  }

  getLogger(): ConsoleLogger {
    return this.logger;
  }
}
