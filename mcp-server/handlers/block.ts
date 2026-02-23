/**
 * Block-level tool handlers
 */

import { BaseToolHandler } from './base.js';
import type { ExecutionContext, JSONSchema } from '../core/types.js';

/**
 * Get a single block's content by ID (kramdown format)
 */
export class GetBlockHandler extends BaseToolHandler<
  { block_id: string },
  { id: string; kramdown: string }
> {
  readonly name = 'get_block';
  readonly description =
    'Get the content of a single block by its ID in kramdown format. More efficient than fetching an entire document when you only need one block.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description: 'The block ID to retrieve',
      },
    },
    required: ['block_id'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ id: string; kramdown: string }> {
    const kramdown = await context.siyuan.block.getBlockKramdown(args.block_id);
    return { id: args.block_id, kramdown };
  }
}

/**
 * Update a single block's content by ID
 */
export class UpdateBlockHandler extends BaseToolHandler<
  { block_id: string; content: string },
  { success: boolean; block_id: string }
> {
  readonly name = 'update_block';
  readonly description =
    'Update the content of a single block by its ID. Replaces the block content with the provided markdown. More efficient than rewriting an entire document for small edits.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description: 'The block ID to update',
      },
      content: {
        type: 'string',
        description: 'New markdown content for the block',
      },
    },
    required: ['block_id', 'content'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ success: boolean; block_id: string }> {
    await context.siyuan.block.updateBlock(args.block_id, args.content);
    return { success: true, block_id: args.block_id };
  }
}

/**
 * Append a child block to a parent block
 */
export class AppendBlockHandler extends BaseToolHandler<
  { parent_id: string; content: string },
  { block_id: string }
> {
  readonly name = 'append_block';
  readonly description =
    'Append a new child block at the end of a parent block. Use this to add content at a specific position within a document rather than at the document level.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      parent_id: {
        type: 'string',
        description: 'The parent block ID to append under',
      },
      content: {
        type: 'string',
        description: 'Markdown content for the new block',
      },
    },
    required: ['parent_id', 'content'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ block_id: string }> {
    const blockId = await context.siyuan.block.appendBlock(
      args.parent_id,
      args.content
    );
    return { block_id: blockId };
  }
}

/**
 * Insert a block before or after a reference block
 */
export class InsertBlockHandler extends BaseToolHandler<
  { content: string; before_id?: string; after_id?: string },
  { block_id: string }
> {
  readonly name = 'insert_block';
  readonly description =
    'Insert a new block before or after an existing block. Provide exactly one of before_id or after_id to control placement.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Markdown content for the new block',
      },
      before_id: {
        type: 'string',
        description:
          'OPTION 1: Insert BEFORE this block ID. Cannot be used together with after_id.',
      },
      after_id: {
        type: 'string',
        description:
          'OPTION 2: Insert AFTER this block ID. Cannot be used together with before_id.',
      },
    },
    required: ['content'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ block_id: string }> {
    const hasBefore = !!args.before_id;
    const hasAfter = !!args.after_id;

    if (!hasBefore && !hasAfter) {
      throw new Error('Must provide exactly one of: before_id or after_id');
    }
    if (hasBefore && hasAfter) {
      throw new Error(
        'Cannot provide both before_id and after_id — choose only one'
      );
    }

    let blockId: string;
    if (hasBefore) {
      blockId = await context.siyuan.block.insertBlockBefore(
        args.before_id,
        args.content
      );
    } else {
      blockId = await context.siyuan.block.insertBlockAfter(
        args.after_id,
        args.content
      );
    }

    return { block_id: blockId };
  }
}

/**
 * Move a block within or between documents
 */
export class MoveBlockHandler extends BaseToolHandler<
  { block_id: string; previous_id?: string; parent_id?: string },
  { success: boolean; block_id: string }
> {
  readonly name = 'move_block';
  readonly description =
    'Move a block to a new position. Use parent_id to move it as a child of another block, or previous_id to place it after a sibling block. Provide at least one destination parameter.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description: 'The block ID to move',
      },
      previous_id: {
        type: 'string',
        description:
          'Place the block after this sibling block ID',
      },
      parent_id: {
        type: 'string',
        description:
          'Move the block as a child of this parent block ID',
      },
    },
    required: ['block_id'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ success: boolean; block_id: string }> {
    if (!args.previous_id && !args.parent_id) {
      throw new Error(
        'Must provide at least one of: previous_id or parent_id'
      );
    }
    await context.siyuan.block.moveBlock(
      args.block_id,
      args.previous_id,
      args.parent_id
    );
    return { success: true, block_id: args.block_id };
  }
}

/**
 * Get immediate children of a block
 */
export class GetChildBlocksHandler extends BaseToolHandler<
  { block_id: string },
  Array<{ id: string; type: string; subType: string }>
> {
  readonly name = 'get_child_blocks';
  readonly description =
    'Get the child blocks of a block by its ID. Supports two-level navigation: (1) call on a document ID to get all top-level blocks (headings, paragraphs, etc.), then (2) call on a heading block ID to get only the blocks within that section. This lets you navigate to a specific section without loading the full document. Returns each child\'s ID, type, subType, and content.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description:
          'The parent block ID whose children to list (often a document ID or heading ID)',
      },
    },
    required: ['block_id'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<Array<{ id: string; type: string; subType: string }>> {
    return await context.siyuan.block.getChildBlocks(args.block_id);
  }
}

/**
 * Get custom attributes of a block
 */
export class GetBlockAttrsHandler extends BaseToolHandler<
  { block_id: string },
  Record<string, string>
> {
  readonly name = 'get_block_attrs';
  readonly description =
    'Get all attributes (including custom attributes) of a block by its ID. Returns key-value pairs such as name, alias, memo, bookmark, and any custom-* attributes.';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description: 'The block ID to get attributes for',
      },
    },
    required: ['block_id'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<Record<string, string>> {
    return await context.siyuan.block.getBlockAttrs(args.block_id);
  }
}

/**
 * Set custom attributes on a block
 */
export class SetBlockAttrsHandler extends BaseToolHandler<
  { block_id: string; attrs: Record<string, string> },
  { success: boolean; block_id: string }
> {
  readonly name = 'set_block_attrs';
  readonly description =
    'Set attributes on a block by its ID. Merges with existing attributes (does not remove unspecified ones). Use custom-* keys for user-defined metadata (e.g. {"custom-status": "reviewed"}).';
  readonly inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description: 'The block ID to set attributes on',
      },
      attrs: {
        type: 'object',
        description:
          'Key-value pairs of attributes to set. Use custom-* prefixed keys for user-defined attributes (e.g. {"custom-status": "done", "custom-priority": "high"})',
      },
    },
    required: ['block_id', 'attrs'],
  };

  async execute(
    args: any,
    context: ExecutionContext
  ): Promise<{ success: boolean; block_id: string }> {
    await context.siyuan.block.setBlockAttrs(args.block_id, args.attrs);
    return { success: true, block_id: args.block_id };
  }
}
