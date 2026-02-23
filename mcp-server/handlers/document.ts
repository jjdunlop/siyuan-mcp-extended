/**
 * Document tool handlers
 */

import { BaseToolHandler } from './base.js';
import type { ExecutionContext, JSONSchema } from '../core/types.js';
import type { DocTreeNodeResponse } from '../../src/types/index.js';

/**
 * Get document content
 */
export class GetDocumentContentHandler extends BaseToolHandler<{ document_id: string; offset?: number; limit?: number }, string> {
  readonly name = 'get_document_content';
  readonly description = 'Read the markdown content of a note in SiYuan. Returns the full note content in markdown format, with optional pagination support';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The note document ID (block ID)',
      },
      offset: {
        type: 'number',
        description: 'Starting line number (0-based index). Default is 0 (start from beginning)',
        default: 0,
      },
      limit: {
        type: 'number',
        description: 'Number of lines to return. If not specified, returns all lines from offset to end',
      },
    },
    required: ['document_id'],
  };

  async execute(args: any, context: ExecutionContext): Promise<string> {
    // Fetch full content to calculate total line count
    const fullContent = await context.siyuan.getFileContent(args.document_id);
    const lines = fullContent.split('\n');
    const totalLines = lines.length;

    // If no offset/limit specified, return full content with metadata
    if (args.offset === undefined && args.limit === undefined) {
      const metaInfo = `--- Document Info ---\nTotal Lines: ${totalLines}\n--- End Info ---\n\n`;
      return metaInfo + fullContent;
    }

    // Paginate
    const offset = args.offset ?? 0;
    const startLine = offset;

    // If start line is out of range, return metadata indicating so
    if (startLine >= totalLines) {
      return `--- Document Info ---\nTotal Lines: ${totalLines}\nRequested Range: ${startLine}-${startLine + (args.limit || 0)}\nStatus: Out of range\n--- End Info ---\n`;
    }

    // Calculate end line
    const endLine = args.limit !== undefined ? startLine + args.limit : totalLines;
    const actualEndLine = Math.min(endLine, totalLines);

    // Build metadata header
    const metaInfo = `--- Document Info ---\nTotal Lines: ${totalLines}\nCurrent Range: ${startLine}-${actualEndLine - 1} (showing ${actualEndLine - startLine} lines)\n--- End Info ---\n\n`;

    // Slice the requested line range
    const selectedContent = lines.slice(startLine, actualEndLine).join('\n');
    return metaInfo + selectedContent;
  }
}

/**
 * Create document
 */
export class CreateDocumentHandler extends BaseToolHandler<
  { notebook_id: string; path: string; content: string },
  string
> {
  readonly name = 'create_document';
  readonly description = 'Create a new note document in a SiYuan notebook with markdown content';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      notebook_id: {
        type: 'string',
        description: 'The target notebook ID where the note will be created',
      },
      path: {
        type: 'string',
        description: 'Note path within the notebook (e.g., /folder/note-title)',
      },
      content: {
        type: 'string',
        description: 'Markdown content for the new note',
      },
    },
    required: ['notebook_id', 'path', 'content'],
  };

  async execute(args: any, context: ExecutionContext): Promise<string> {
    return await context.siyuan.createFile(args.notebook_id, args.path, args.content);
  }
}

/**
 * Append to document
 */
export class AppendToDocumentHandler extends BaseToolHandler<
  { document_id: string; content: string },
  string
> {
  readonly name = 'append_to_document';
  readonly description = 'Append markdown content to the end of an existing note in SiYuan';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The target note document ID',
      },
      content: {
        type: 'string',
        description: 'Markdown content to append to the note',
      },
    },
    required: ['document_id', 'content'],
  };

  async execute(args: any, context: ExecutionContext): Promise<string> {
    return await context.siyuan.appendToFile(args.document_id, args.content);
  }
}

/**
 * Update document
 */
export class UpdateDocumentHandler extends BaseToolHandler<
  { document_id: string; content: string },
  { success: boolean; document_id: string }
> {
  readonly name = 'update_document';
  readonly description = 'Replace the entire content of a note in SiYuan with new markdown content (overwrites existing content)';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The note document ID to update',
      },
      content: {
        type: 'string',
        description: 'New markdown content that will replace the existing note content',
      },
    },
    required: ['document_id', 'content'],
  };

  async execute(args: any, context: ExecutionContext): Promise<{ success: boolean; document_id: string }> {
    await context.siyuan.overwriteFile(args.document_id, args.content);
    return { success: true, document_id: args.document_id };
  }
}

/**
 * Append to daily note
 */
export class AppendToDailyNoteHandler extends BaseToolHandler<
  { notebook_id: string; content: string },
  string
> {
  readonly name = 'append_to_daily_note';
  readonly description = "Append markdown content to today's daily note in SiYuan (automatically creates the daily note if it doesn't exist)";
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      notebook_id: {
        type: 'string',
        description: 'The notebook ID where the daily note resides',
      },
      content: {
        type: 'string',
        description: 'Markdown content to append to today\'s daily note',
      },
    },
    required: ['notebook_id', 'content'],
  };

  async execute(args: any, context: ExecutionContext): Promise<string> {
    return await context.siyuan.appendToDailyNote(args.notebook_id, args.content);
  }
}

/**
 * Move documents by ID
 */
export class MoveDocumentsHandler extends BaseToolHandler<
  { from_ids: string | string[]; to_parent_id?: string; to_notebook_root?: string },
  { success: boolean; moved_count: number; from_ids: string[]; to_parent_id?: string; to_notebook_root?: string }
> {
  readonly name = 'move_documents';
  readonly description = 'Move one or more notes to a new location in SiYuan. Provide EXACTLY ONE destination: either to_parent_id (to nest notes under a parent note) OR to_notebook_root (to move notes to notebook top level).';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      from_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of note document IDs to move. For a single note, use an array with one element: ["note-id"]',
      },
      to_parent_id: {
        type: 'string',
        description: 'OPTION 1: Parent note document ID. Notes will be nested under this parent note as children. Cannot be used together with to_notebook_root.',
      },
      to_notebook_root: {
        type: 'string',
        description: 'OPTION 2: Notebook ID. Notes will be moved to the top level of this notebook. Cannot be used together with to_parent_id.',
      },
    },
    required: ['from_ids'],
  };

  async execute(args: any, context: ExecutionContext): Promise<{ success: boolean; moved_count: number; from_ids: string[]; to_parent_id?: string; to_notebook_root?: string }> {
    // Normalise from_ids — accept a single string or an array
    let fromIds: string[];

    if (Array.isArray(args.from_ids)) {
      fromIds = args.from_ids;
    } else if (typeof args.from_ids === 'string') {
      // If it looks like a JSON array string, parse it
      if (args.from_ids.startsWith('[')) {
        try {
          fromIds = JSON.parse(args.from_ids);
        } catch {
          fromIds = [args.from_ids];
        }
      } else {
        fromIds = [args.from_ids];
      }
    } else {
      throw new Error('from_ids must be a string or array of strings');
    }

    // Exactly one destination must be provided
    const hasParentId = !!args.to_parent_id;
    const hasNotebookRoot = !!args.to_notebook_root;

    if (!hasParentId && !hasNotebookRoot) {
      throw new Error('Must provide exactly one of: to_parent_id (for nested placement) or to_notebook_root (for root placement)');
    }

    if (hasParentId && hasNotebookRoot) {
      throw new Error('Cannot provide both to_parent_id and to_notebook_root - choose only one target location');
    }

    // Option 1: nest under a parent document
    if (hasParentId) {
      await context.siyuan.document.moveDocumentsByIds(fromIds, args.to_parent_id);
    }
    // Option 2: move to notebook root
    else {
      await context.siyuan.document.moveDocumentsToNotebookRoot(fromIds, args.to_notebook_root);
    }

    return {
      success: true,
      moved_count: fromIds.length,
      from_ids: fromIds,
      to_parent_id: args.to_parent_id,
      to_notebook_root: args.to_notebook_root
    };
  }
}

/**
 * Get document tree
 */
export class GetDocumentTreeHandler extends BaseToolHandler<
  { id: string; depth?: number },
  DocTreeNodeResponse[]
> {
  readonly name = 'get_document_tree';
  readonly description = 'Get the hierarchical structure of notes in SiYuan with specified depth. Returns the note tree starting from a notebook or parent note.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Starting point: note document ID or notebook ID',
      },
      depth: {
        type: 'number',
        description: 'How deep to traverse the note hierarchy (1 = direct children only, 2 = children and grandchildren, etc.). Default is 1.',
        default: 1,
      },
    },
    required: ['id'],
  };

  async execute(args: any, context: ExecutionContext): Promise<DocTreeNodeResponse[]> {
    const depth = args.depth || 1;
    return await context.siyuan.document.getDocumentTree(args.id, depth);
  }
}

/**
 * Rename a document
 */
export class RenameDocumentHandler extends BaseToolHandler<
  { notebook_id: string; path: string; new_name: string },
  { success: boolean }
> {
  readonly name = 'rename_document';
  readonly description =
    'Rename a document in SiYuan. Requires the notebook ID, the document path, and the new title.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      notebook_id: {
        type: 'string',
        description: 'The notebook ID containing the document',
      },
      path: {
        type: 'string',
        description: 'The document path within the notebook (e.g. /folder/old-title)',
      },
      new_name: {
        type: 'string',
        description: 'The new title for the document',
      },
    },
    required: ['notebook_id', 'path', 'new_name'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ success: boolean }> {
    await context.siyuan.document.renameDocument(
      args.notebook_id,
      args.path,
      args.new_name
    );
    return { success: true };
  }
}

/**
 * Remove (delete) a document
 */
export class RemoveDocumentHandler extends BaseToolHandler<
  { notebook_id: string; path: string },
  { success: boolean }
> {
  readonly name = 'remove_document';
  readonly description =
    'Delete a document from SiYuan. Requires the notebook ID and the document path. This action is irreversible.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      notebook_id: {
        type: 'string',
        description: 'The notebook ID containing the document',
      },
      path: {
        type: 'string',
        description: 'The document path within the notebook to delete',
      },
    },
    required: ['notebook_id', 'path'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ success: boolean }> {
    await context.siyuan.document.removeDocument(args.notebook_id, args.path);
    return { success: true };
  }
}

/**
 * Resolve a block ID to its human-readable path
 */
export class GetHPathByIdHandler extends BaseToolHandler<
  { block_id: string },
  { hpath: string }
> {
  readonly name = 'get_hpath_by_id';
  readonly description =
    'Resolve a block ID to its human-readable document path (e.g. /Research/GNN/RQ3). Useful for displaying location context when working with block IDs from SQL queries or other operations.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description: 'The block ID to resolve',
      },
    },
    required: ['block_id'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ hpath: string }> {
    const hpath = await context.siyuan.document.getHumanReadablePath(
      args.block_id
    );
    return { hpath };
  }
}
