/**
 * SiYuan block operations API
 */

import type { SiyuanClient } from './client.js';

export class SiyuanBlockApi {
  constructor(private client: SiyuanClient) {}

  async getBlockKramdown(blockId: string): Promise<string> {
    const response = await this.client.request<{ id: string; kramdown: string }>(
      '/api/block/getBlockKramdown',
      { id: blockId }
    );
    return response.data.kramdown;
  }

  async getBlockMarkdown(blockId: string): Promise<string> {
    const response = await this.client.request<{ content: string }>(
      '/api/export/exportMdContent',
      { id: blockId }
    );
    return response.data.content;
  }

  async updateBlock(blockId: string, content: string): Promise<void> {
    const response = await this.client.request('/api/block/updateBlock', {
      id: blockId,
      dataType: 'markdown',
      data: content,
    });

    if (response.code !== 0) {
      throw new Error(`Failed to update block: ${response.msg}`);
    }
  }

  async appendBlock(parentId: string, content: string): Promise<string> {
    interface BlockOperation {
      doOperations: Array<{ id: string; action: string }>;
    }
    const response = await this.client.request<BlockOperation[]>(
      '/api/block/appendBlock',
      {
        parentID: parentId,
        dataType: 'markdown',
        data: content,
      }
    );

    if (response.code !== 0) {
      throw new Error(`Failed to append block: ${response.msg}`);
    }

    return response.data[0].doOperations[0].id;
  }

  async insertBlockBefore(previousId: string, content: string): Promise<string> {
    interface BlockOperation {
      doOperations: Array<{ id: string; action: string }>;
    }
    const response = await this.client.request<BlockOperation[]>(
      '/api/block/insertBlock',
      {
        previousID: previousId,
        dataType: 'markdown',
        data: content,
      }
    );

    if (response.code !== 0) {
      throw new Error(`Failed to insert block: ${response.msg}`);
    }

    return response.data[0].doOperations[0].id;
  }

  async insertBlockAfter(nextId: string, content: string): Promise<string> {
    interface BlockOperation {
      doOperations: Array<{ id: string; action: string }>;
    }
    const response = await this.client.request<BlockOperation[]>(
      '/api/block/insertBlock',
      {
        nextID: nextId,
        dataType: 'markdown',
        data: content,
      }
    );

    if (response.code !== 0) {
      throw new Error(`Failed to insert block: ${response.msg}`);
    }

    return response.data[0].doOperations[0].id;
  }

  async deleteBlock(blockId: string): Promise<void> {
    const response = await this.client.request('/api/block/deleteBlock', { id: blockId });

    if (response.code !== 0) {
      throw new Error(`Failed to delete block: ${response.msg}`);
    }
  }

  async moveBlock(blockId: string, previousId?: string, parentId?: string): Promise<void> {
    const response = await this.client.request('/api/block/moveBlock', {
      id: blockId,
      previousID: previousId,
      parentID: parentId,
    });

    if (response.code !== 0) {
      throw new Error(`Failed to move block: ${response.msg}`);
    }
  }

  async getChildBlocks(blockId: string): Promise<Array<{ id: string; type: string; subType: string }>> {
    const response = await this.client.request<Array<{ id: string; type: string; subType: string }>>(
      '/api/block/getChildBlocks',
      { id: blockId }
    );
    return response.data || [];
  }

  async getBlockAttrs(blockId: string): Promise<Record<string, string>> {
    const response = await this.client.request<Record<string, string>>(
      '/api/attr/getBlockAttrs',
      { id: blockId }
    );
    return response.data || {};
  }

  async setBlockAttrs(blockId: string, attrs: Record<string, string>): Promise<void> {
    const response = await this.client.request('/api/attr/setBlockAttrs', {
      id: blockId,
      attrs: attrs,
    });

    if (response.code !== 0) {
      throw new Error(`Failed to set block attrs: ${response.msg}`);
    }
  }
}
