import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  Difficulty,
  DraftImageAsset,
  ImageRole,
  ImageAsset,
  MistakeDraft,
  MistakeItem,
  ReviewLog,
  ReviewResult,
  TaxonomyOption,
  TaxonomyType
} from '../types';
import { DEFAULT_REVIEW_INTERVALS, firstReviewDate, getReviewPlan } from '../lib/review';
import { getDefaultExamYear } from '../lib/exam';

export const uid = () => crypto.randomUUID();

const now = () => new Date().toISOString();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'main',
  reviewIntervals: DEFAULT_REVIEW_INTERVALS,
  examYear: getDefaultExamYear(),
  imageQuality: 0.86,
  imageMaxSize: 1800,
  thumbnailMaxSize: 520
};

const DEFAULT_TAXONOMIES: Array<Omit<TaxonomyOption, 'id' | 'createdAt'>> = [
  { type: 'subject', name: '数学', sortOrder: 1 },
  { type: 'subject', name: '语文', sortOrder: 2 },
  { type: 'subject', name: '英语', sortOrder: 3 },
  { type: 'cause', name: '概念不清', sortOrder: 1 },
  { type: 'cause', name: '粗心', sortOrder: 2 },
  { type: 'cause', name: '方法不会', sortOrder: 3 },
  { type: 'source', name: '作业', sortOrder: 1 },
  { type: 'source', name: '试卷', sortOrder: 2 },
  { type: 'source', name: '练习册', sortOrder: 3 }
];

class CuotibenDatabase extends Dexie {
  mistakes!: Table<MistakeItem, string>;
  images!: Table<ImageAsset, string>;
  taxonomies!: Table<TaxonomyOption, string>;
  reviewLogs!: Table<ReviewLog, string>;
  settings!: Table<AppSettings, string>;
  draftImages!: Table<DraftImageAsset, string>;

  constructor() {
    super('cuotibenapp');
    this.version(1).stores({
      mistakes: 'id, createdAt, updatedAt, subjectId, causeId, sourceId, nextReviewAt, archived, reviewStage, difficulty',
      images: 'id, mistakeId, createdAt',
      taxonomies: 'id, type, name, sortOrder',
      reviewLogs: 'id, mistakeId, reviewedAt',
      settings: 'id'
    });
    this.version(2).stores({
      mistakes: 'id, createdAt, updatedAt, subjectId, causeId, sourceId, nextReviewAt, archived, reviewStage, difficulty',
      images: 'id, mistakeId, role, createdAt',
      taxonomies: 'id, type, name, sortOrder',
      reviewLogs: 'id, mistakeId, reviewedAt',
      settings: 'id'
    }).upgrade(async (transaction) => {
      await transaction.table('images').toCollection().modify((image: Partial<ImageAsset>) => {
        image.role = image.role ?? 'question';
      });
      await transaction.table('mistakes').toCollection().modify((mistake: Partial<MistakeItem>) => {
        mistake.sourceName = mistake.sourceName ?? '';
      });
      await transaction.table('settings').toCollection().modify((settings: Partial<AppSettings>) => {
        settings.examYear = settings.examYear ?? getDefaultExamYear();
        settings.reviewIntervals = settings.reviewIntervals?.length ? settings.reviewIntervals : DEFAULT_REVIEW_INTERVALS;
      });
    });
    this.version(3).stores({
      mistakes: 'id, createdAt, updatedAt, subjectId, causeId, sourceId, nextReviewAt, archived, reviewStage, difficulty',
      images: 'id, mistakeId, role, createdAt',
      taxonomies: 'id, type, name, sortOrder',
      reviewLogs: 'id, mistakeId, reviewedAt',
      settings: 'id',
      draftImages: 'id, role, createdAt'
    });
  }
}

export const db = new CuotibenDatabase();

export const ensureSeedData = async () => {
  const [settingsCount, taxonomyCount] = await Promise.all([
    db.settings.count(),
    db.taxonomies.count()
  ]);

  if (settingsCount === 0) {
    await db.settings.put(DEFAULT_SETTINGS);
  }

  if (taxonomyCount === 0) {
    const createdAt = now();
    await db.taxonomies.bulkPut(
      DEFAULT_TAXONOMIES.map((item) => ({
        ...item,
        id: uid(),
        createdAt
      }))
    );
  }

  await removeDemoMistakes();
};

const DEMO_PREFIX = '演示错题';

const removeDemoMistakes = async () => {
  const demoMistakes = await db.mistakes.filter((mistake) => mistake.title.startsWith(DEMO_PREFIX)).toArray();
  if (demoMistakes.length === 0) return;
  const ids = demoMistakes.map((mistake) => mistake.id);
  await db.transaction('rw', db.mistakes, db.images, db.reviewLogs, async () => {
    await db.mistakes.bulkDelete(ids);
    await db.images.where('mistakeId').anyOf(ids).delete();
    await db.reviewLogs.where('mistakeId').anyOf(ids).delete();
  });
};

export const getSettings = async () => {
  const settings = await db.settings.get('main');
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    reviewIntervals: settings?.reviewIntervals?.length ? settings.reviewIntervals : DEFAULT_SETTINGS.reviewIntervals
  };
};

export const updateSettings = async (settings: Partial<Omit<AppSettings, 'id'>>) => {
  const current = await getSettings();
  await db.settings.put({ ...current, ...settings, id: 'main' });
};

export const addMistake = async (draft: MistakeDraft, images: Omit<ImageAsset, 'id' | 'mistakeId' | 'createdAt'>[]) => {
  const createdAt = now();
  const id = uid();
  const taxonomyMap = new Map((await db.taxonomies.toArray()).map((item) => [item.id, item.name]));
  const sourceName = draft.sourceName.trim() || taxonomyMap.get(draft.sourceId) || '';
  const item: MistakeItem = {
    id,
    ...draft,
    subjectName: taxonomyMap.get(draft.subjectId) ?? '',
    causeName: taxonomyMap.get(draft.causeId) ?? '',
    sourceName,
    reviewStage: 0,
    nextReviewAt: firstReviewDate(draft.difficulty),
    archived: false,
    createdAt,
    updatedAt: createdAt
  };

  await db.transaction('rw', db.mistakes, db.images, async () => {
    await db.mistakes.add(item);
    await db.images.bulkAdd(
      images.map((image) => ({
        ...image,
        id: uid(),
        mistakeId: id,
        createdAt
      }))
    );
  });

  return id;
};

export const addTaxonomy = async (type: TaxonomyType, name: string) => {
  const normalized = name.trim();
  if (!normalized) return;
  const count = await db.taxonomies.where('type').equals(type).count();
  await db.taxonomies.add({
    id: uid(),
    type,
    name: normalized,
    sortOrder: count + 1,
    createdAt: now()
  });
};

export const renameTaxonomy = async (id: string, name: string) => {
  const normalized = name.trim();
  if (!normalized) return;
  await db.taxonomies.update(id, { name: normalized });
};

export const deleteTaxonomy = async (id: string) => {
  await db.taxonomies.delete(id);
};

export const recordReview = async (mistake: MistakeItem, result: ReviewResult) => {
  const settings = await getSettings();
  const plan = getReviewPlan(mistake.reviewStage, result, settings.reviewIntervals);
  const reviewedAt = now();
  const log: ReviewLog = {
    id: uid(),
    mistakeId: mistake.id,
    result,
    reviewedAt,
    previousStage: mistake.reviewStage,
    nextStage: plan.nextStage,
    nextReviewAt: plan.nextReviewAt
  };

  await db.transaction('rw', db.mistakes, db.reviewLogs, async () => {
    await db.mistakes.update(mistake.id, {
      reviewStage: plan.nextStage,
      nextReviewAt: plan.nextReviewAt,
      updatedAt: reviewedAt
    });
    await db.reviewLogs.add(log);
  });
};

export const replaceAllData = async (
  mistakes: MistakeItem[],
  images: ImageAsset[],
  taxonomies: TaxonomyOption[],
  reviewLogs: ReviewLog[],
  settings: AppSettings
) => {
  await db.transaction('rw', db.mistakes, db.images, db.taxonomies, db.reviewLogs, db.settings, async () => {
    await Promise.all([
      db.mistakes.clear(),
      db.images.clear(),
      db.taxonomies.clear(),
      db.reviewLogs.clear(),
      db.settings.clear()
    ]);
    await db.mistakes.bulkPut(mistakes);
    await db.images.bulkPut(images);
    await db.taxonomies.bulkPut(taxonomies);
    await db.reviewLogs.bulkPut(reviewLogs);
    await db.settings.put(settings);
  });
};

export const normalizeImageRole = (role?: ImageRole) => role ?? 'question';
