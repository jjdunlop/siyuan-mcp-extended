/**
 * 笔记本相关工具处理器
 */

import { BaseToolHandler } from './base.js';
import type { ExecutionContext, JSONSchema } from '../core/types.js';
import type { NotebookResponse, SearchResultResponse } from '../../src/types/index.js';

/**
 * 列出所有笔记本
 */
export class ListNotebooksHandler extends BaseToolHandler<{}, NotebookResponse[]> {
  readonly name = 'list_notebooks';
  readonly description = 'List all notebooks in your SiYuan workspace. Notebooks are top-level containers for organizing your notes';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {},
  };

  async execute(_args: any, context: ExecutionContext): Promise<NotebookResponse[]> {
    return await context.siyuan.notebook.listNotebooks();
  }
}

/**
 * 获取最近更新的文档
 */
export class GetRecentlyUpdatedDocumentsHandler extends BaseToolHandler<
  { limit?: number; notebook_id?: string },
  SearchResultResponse[]
> {
  readonly name = 'get_recently_updated_documents';
  readonly description = 'Get recently modified notes in SiYuan, sorted by update time (most recent first). Useful for finding what you worked on recently';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of notes to return (default: 10)',
        default: 10,
      },
      notebook_id: {
        type: 'string',
        description: 'Optional: Filter to a specific notebook ID',
      },
    },
  };

  async execute(args: any, context: ExecutionContext): Promise<SearchResultResponse[]> {
    return await context.siyuan.helpers.getRecentlyUpdatedDocuments(
      args.limit || 10,
      args.notebook_id
    );
  }
}

/**
 * 设置每日笔记格式
 */
export class SetDailyNoteFormatHandler extends BaseToolHandler<
  { notebook_id: string; path_template: string },
  string
> {
  readonly name = 'set_daily_note_format';
  readonly description = `Configure the folder structure and file naming format for daily notes in a SiYuan notebook. Uses Go time format via Sprig templates.

Available format tokens:
- {{now | date "2006"}}    → 4-digit year (e.g. 2024)
- {{now | date "01"}}      → 2-digit month number (e.g. 03)
- {{now | date "January"}} → full month name (e.g. March)
- {{now | date "Jan"}}     → abbreviated month (e.g. Mar)
- {{now | date "02"}}      → 2-digit day (e.g. 21)
- {{now | date "2006-01-02"}} → full date (e.g. 2024-03-21)

Default format produces: Daily Notes/2024/03 - March/2024-03-21`;

  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      notebook_id: {
        type: 'string',
        description: 'The notebook ID to configure',
      },
      path_template: {
        type: 'string',
        description:
          'Path template for daily notes using Go/Sprig date format. ' +
          'Example (default): /Daily Notes/{{now | date "2006"}}/{{now | date "01"}} - {{now | date "January"}}/{{now | date "2006-01-02"}}',
      },
    },
    required: ['notebook_id', 'path_template'],
  };

  async execute(args: any, context: ExecutionContext): Promise<string> {
    const currentConf = await context.siyuan.notebook.getNotebookConf(args.notebook_id);
    await context.siyuan.notebook.setNotebookConf(args.notebook_id, {
      ...currentConf,
      dailyNoteSavePath: args.path_template,
    });
    return `Daily note format updated to: ${args.path_template}`;
  }
}

/**
 * 创建新笔记本
 */
export class CreateNotebookHandler extends BaseToolHandler<{ name: string }, string> {
  readonly name = 'create_notebook';
  readonly description = 'Create a new notebook in SiYuan with the specified name';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the new notebook',
      },
    },
    required: ['name'],
  };

  async execute(args: any, context: ExecutionContext): Promise<string> {
    return await context.siyuan.notebook.createNotebook(args.name);
  }
}

