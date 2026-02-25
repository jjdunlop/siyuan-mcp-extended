/**
 * Export all tool handlers
 */

export { BaseToolHandler } from './base.js';

// Search
export * from './search.js';

// Documents
export * from './document.js';

// Blocks
export * from './block.js';

// Notebooks
export * from './notebook.js';

// Snapshots
export * from './snapshot.js';

// Tags
export * from './tag.js';

import {
  UnifiedSearchHandler,
  ExecuteSqlHandler,
  FindBlockInDocumentHandler,
} from './search.js';
import {
  GetDocumentContentHandler,
  CreateDocumentHandler,
  AppendToDocumentHandler,
  UpdateDocumentHandler,
  AppendToDailyNoteHandler,
  MoveDocumentsHandler,
  GetDocumentTreeHandler,
  RenameDocumentHandler,
  RemoveDocumentHandler,
  GetHPathByIdHandler,
} from './document.js';
import {
  GetBlockHandler,
  UpdateBlockHandler,
  AppendBlockHandler,
  InsertBlockHandler,
  MoveBlockHandler,
  GetChildBlocksHandler,
  GetSectionContentHandler,
  GetDocumentForBlockHandler,
  GetBlockAttrsHandler,
  SetBlockAttrsHandler,
} from './block.js';
import {
  ListNotebooksHandler,
  GetRecentlyUpdatedDocumentsHandler,
  CreateNotebookHandler,
  SetDailyNoteFormatHandler,
} from './notebook.js';
import {
  CreateSnapshotHandler,
  ListSnapshotsHandler,
  RollbackSnapshotHandler,
} from './snapshot.js';
import {
  ListAllTagsHandler,
  ReplaceTagHandler,
} from './tag.js';

export function createAllHandlers() {
  return [
    // Search
    new UnifiedSearchHandler(),
    new ExecuteSqlHandler(),
    new FindBlockInDocumentHandler(),

    // Documents
    new GetDocumentContentHandler(),
    new CreateDocumentHandler(),
    new AppendToDocumentHandler(),
    new UpdateDocumentHandler(),
    new AppendToDailyNoteHandler(),
    new MoveDocumentsHandler(),
    new GetDocumentTreeHandler(),
    new RenameDocumentHandler(),
    new RemoveDocumentHandler(),
    new GetHPathByIdHandler(),

    // Blocks
    new GetBlockHandler(),
    new UpdateBlockHandler(),
    new AppendBlockHandler(),
    new InsertBlockHandler(),
    new MoveBlockHandler(),
    new GetChildBlocksHandler(),
    new GetSectionContentHandler(),
    new GetDocumentForBlockHandler(),
    new GetBlockAttrsHandler(),
    new SetBlockAttrsHandler(),

    // Notebooks
    new ListNotebooksHandler(),
    new GetRecentlyUpdatedDocumentsHandler(),
    new CreateNotebookHandler(),
    new SetDailyNoteFormatHandler(),

    // Snapshots
    new CreateSnapshotHandler(),
    new ListSnapshotsHandler(),
    new RollbackSnapshotHandler(),

    // Tags
    new ListAllTagsHandler(),
    new ReplaceTagHandler(),
  ];
}
