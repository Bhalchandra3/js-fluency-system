// api/_lib/mistakes/index.ts

export { MistakeApiError } from './errors.js';
export {
    listMistakes,
    getMistakeById,
    createMistake,
    updateMistake,
    type ListMistakesQuery,
    type ListMistakesResponse,
    type MistakeDetailResponse,
    type MistakeListItemDto,
    type MistakeDetailDto,
} from './mistakeService.js';
