// api/_lib/deep-dive/index.ts

export { DeepDiveApiError } from './errors.js';
export {
    listDeepDiveNotes,
    updateDeepDiveNote,
    deleteDeepDiveNote,
    type ListDeepDiveResponse,
    type DeepDiveNoteResponse,
    type DeleteDeepDiveResponse,
    type DeepDiveNoteDto,
    type DeepDiveTopicDto,
} from './deepDiveService.js';
