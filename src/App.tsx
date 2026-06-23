import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Archive,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Database,
  Download,
  GraduationCap,
  ImagePlus,
  Images,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Tags,
  Trash2,
} from 'lucide-react';
import {
  addMistake,
  addTaxonomy,
  db,
  deleteTaxonomy,
  ensureSeedData,
  getSettings,
  recordReview,
  renameTaxonomy,
  updateSettings
} from './data/db';
import { exportBackup, importBackup } from './data/backup';
import { compressImage, pickImagesFromDevice, takePhotoFromCamera } from './lib/images';
import { difficultyLabel, getReviewPlan, reviewResultLabel } from './lib/review';
import { endOfToday, formatShortDate, startOfToday, toDateKey } from './lib/dates';
import { getGaokaoCountdown } from './lib/exam';
import type {
  AppSettings,
  DraftImageAsset,
  Difficulty,
  ImageAsset,
  ImageRole,
  MistakeDraft,
  MistakeItem,
  ReviewResult,
  TaxonomyOption,
  TaxonomyType
} from './types';

type TabKey = 'today' | 'import' | 'gallery' | 'calendar' | 'settings';
type SettingsPanel = 'learning' | 'taxonomy' | 'review' | 'backup' | 'storage';

interface PendingImage {
  id: string;
  file: File;
  url: string;
}

const taxonomyTitles: Record<TaxonomyType, string> = {
  subject: '科目',
  cause: '错因',
  source: '题源快捷项'
};

const emptyDraft: MistakeDraft = {
  title: '',
  note: '',
  answer: '',
  inspiration: '',
  subjectId: '',
  causeId: '',
  sourceId: '',
  sourceName: '',
  difficulty: 'medium'
};

const springSoft = { duration: 0.08, ease: 'easeOut' } as const;
const springSnappy = { duration: 0.08, ease: 'easeOut' } as const;
const fadeSlide = { duration: 0.06, ease: 'easeOut' } as const;
const IMPORT_DRAFT_KEY = 'cuotiben.importDraft.v1';

const releasePendingImages = (list: PendingImage[]) => {
  list.forEach((image) => URL.revokeObjectURL(image.url));
};

const pendingToDraftAsset = (image: PendingImage, role: ImageRole): DraftImageAsset => ({
  id: image.id,
  role,
  imageBlob: image.file,
  fileName: image.file.name,
  mimeType: image.file.type || 'image/jpeg',
  createdAt: new Date().toISOString()
});

const draftAssetToPending = (asset: DraftImageAsset): PendingImage => {
  const file = new File([asset.imageBlob], asset.fileName, { type: asset.mimeType || asset.imageBlob.type || 'image/jpeg' });
  return {
    id: asset.id,
    file,
    url: URL.createObjectURL(file)
  };
};

const loadImportDraft = () => {
  try {
    const saved = window.localStorage.getItem(IMPORT_DRAFT_KEY);
    return saved ? { ...emptyDraft, ...JSON.parse(saved) } as MistakeDraft : emptyDraft;
  } catch {
    return emptyDraft;
  }
};

function App() {
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [taxonomies, setTaxonomies] = useState<TaxonomyOption[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [toast, setToast] = useState('');
  const [bootError, setBootError] = useState('');
  const [importDraft, setImportDraft] = useState<MistakeDraft>(() => loadImportDraft());
  const [questionImages, setQuestionImages] = useState<PendingImage[]>([]);
  const [answerImages, setAnswerImages] = useState<PendingImage[]>([]);
  const questionImagesRef = useRef<PendingImage[]>([]);
  const answerImagesRef = useRef<PendingImage[]>([]);
  const draftImagesLoadedRef = useRef(false);

  const refresh = async () => {
    const [nextMistakes, nextImages, nextTaxonomies, nextSettings] = await Promise.all([
      db.mistakes.orderBy('createdAt').reverse().toArray(),
      db.images.orderBy('createdAt').toArray(),
      db.taxonomies.orderBy('sortOrder').toArray(),
      getSettings()
    ]);
    setMistakes(nextMistakes);
    setImages(nextImages);
    setTaxonomies(nextTaxonomies);
    setSettings(nextSettings);
  };

  useEffect(() => {
    ensureSeedData()
      .then(async () => {
        const draftImages = await db.draftImages.orderBy('createdAt').toArray();
        setQuestionImages(draftImages.filter((image) => image.role === 'question').map(draftAssetToPending));
        setAnswerImages(draftImages.filter((image) => image.role === 'answer').map(draftAssetToPending));
        draftImagesLoadedRef.current = true;
      })
      .then(refresh)
      .catch((err) => {
        const message = err instanceof Error ? err.message : '初始化失败';
        setBootError(message);
        setToast(message);
      });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    questionImagesRef.current = questionImages;
  }, [questionImages]);

  useEffect(() => {
    answerImagesRef.current = answerImages;
  }, [answerImages]);

  useEffect(() => {
    window.localStorage.setItem(IMPORT_DRAFT_KEY, JSON.stringify(importDraft));
  }, [importDraft]);

  useEffect(() => {
    if (!draftImagesLoadedRef.current) return;
    const saveDraftImages = async () => {
      const rows = [
        ...questionImages.map((image) => pendingToDraftAsset(image, 'question')),
        ...answerImages.map((image) => pendingToDraftAsset(image, 'answer'))
      ];
      await db.transaction('rw', db.draftImages, async () => {
        await db.draftImages.clear();
        if (rows.length) await db.draftImages.bulkPut(rows);
      });
    };
    saveDraftImages().catch((err) => console.error('保存导入草稿图片失败', err));
  }, [answerImages, questionImages]);

  useEffect(() => () => {
    releasePendingImages(questionImagesRef.current);
    releasePendingImages(answerImagesRef.current);
  }, []);

  const imagesByMistake = useMemo(() => {
    const map = new Map<string, ImageAsset[]>();
    images.forEach((image) => {
      const list = map.get(image.mistakeId) ?? [];
      list.push(image);
      map.set(image.mistakeId, list);
    });
    return map;
  }, [images]);

  const taxonomyMap = useMemo(() => new Map(taxonomies.map((item) => [item.id, item.name])), [taxonomies]);

  const taxonomiesByType = useMemo(() => {
    const grouped: Record<TaxonomyType, TaxonomyOption[]> = { subject: [], cause: [], source: [] };
    taxonomies.forEach((item) => grouped[item.type].push(item));
    return grouped;
  }, [taxonomies]);

  const liveMistakes = mistakes.filter((item) => !item.archived);
  const dueMistakes = liveMistakes
    .filter((item) => new Date(item.nextReviewAt).getTime() <= endOfToday().getTime())
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());

  const handleReviewed = async (mistake: MistakeItem, result: ReviewResult) => {
    await recordReview(mistake, result);
    await refresh();
    setToast(`已记录：${reviewResultLabel[result]}`);
  };

  const handleArchive = async (mistake: MistakeItem) => {
    await db.mistakes.update(mistake.id, { archived: !mistake.archived, updatedAt: new Date().toISOString() });
    await refresh();
  };

  const handleImportBackup = async (file: File) => {
    await importBackup(file);
    await refresh();
    setToast('已恢复备份');
  };

  if (!settings) {
    return (
      <div className="loading">
        <p>{bootError || '正在打开错题本'}</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}</p>
          <h1>错题本</h1>
        </div>
        <motion.div
          className="stat-pill"
          transition={reducedMotion ? { duration: 0 } : springSoft}
        >
          {dueMistakes.length} 待复习
        </motion.div>
      </header>

      <main className="content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : fadeSlide}
          >
            {activeTab === 'today' && (
              <TodayView
                settings={settings}
                dueMistakes={dueMistakes}
                imagesByMistake={imagesByMistake}
                taxonomyMap={taxonomyMap}
                onReviewed={handleReviewed}
                onArchive={handleArchive}
              />
            )}
            {activeTab === 'import' && (
              <ImportView
                settings={settings}
                taxonomiesByType={taxonomiesByType}
                draft={importDraft}
                onDraftChange={setImportDraft}
                questionImages={questionImages}
                answerImages={answerImages}
                onQuestionImagesChange={setQuestionImages}
                onAnswerImagesChange={setAnswerImages}
                onSaved={async () => {
                  await refresh();
                  setActiveTab('gallery');
                  setToast('已存入错题本');
                }}
              />
            )}
            {activeTab === 'gallery' && (
              <GalleryView
                mistakes={liveMistakes}
                imagesByMistake={imagesByMistake}
                taxonomyMap={taxonomyMap}
                taxonomiesByType={taxonomiesByType}
                onArchive={handleArchive}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarView
                mistakes={liveMistakes}
                imagesByMistake={imagesByMistake}
                taxonomyMap={taxonomyMap}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                taxonomiesByType={taxonomiesByType}
                onRefresh={refresh}
                onExport={async () => {
                  const message = await exportBackup();
                  setToast(message);
                }}
                onImport={handleImportBackup}
                onToast={setToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="tabbar">
        <TabButton active={activeTab === 'today'} icon={<BookOpen />} label="今日" onClick={() => setActiveTab('today')} />
        <TabButton active={activeTab === 'import'} icon={<ImagePlus />} label="导入" onClick={() => setActiveTab('import')} />
        <TabButton active={activeTab === 'gallery'} icon={<Images />} label="画廊" onClick={() => setActiveTab('gallery')} />
        <TabButton active={activeTab === 'calendar'} icon={<CalendarDays />} label="日历" onClick={() => setActiveTab('calendar')} />
        <TabButton active={activeTab === 'settings'} icon={<Settings />} label="设置" onClick={() => setActiveTab('settings')} />
      </nav>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={reducedMotion ? { duration: 0 } : springSnappy}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: JSX.Element; label: string; onClick: () => void }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      className={`tab-button ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
      aria-label={label}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
    >
      {active && (
        <motion.span
          className="tab-highlight"
          layoutId="tab-highlight"
          transition={reducedMotion ? { duration: 0 } : springSnappy}
        />
      )}
      <span className="tab-icon">{icon}</span>
      <span className="tab-label">{label}</span>
    </motion.button>
  );
}

function TodayView({
  settings,
  dueMistakes,
  imagesByMistake,
  taxonomyMap,
  onReviewed,
  onArchive
}: {
  settings: AppSettings;
  dueMistakes: MistakeItem[];
  imagesByMistake: Map<string, ImageAsset[]>;
  taxonomyMap: Map<string, string>;
  onReviewed: (mistake: MistakeItem, result: ReviewResult) => Promise<void>;
  onArchive: (mistake: MistakeItem) => Promise<void>;
}) {
  return (
    <section className="stack">
      <GaokaoCard examYear={settings.examYear} />
      <SectionHeading title="今日复习" meta={`${dueMistakes.length} 道`} />
      <AnimatePresence initial={false}>
        {dueMistakes.map((mistake) => (
          <MistakeCard
            key={mistake.id}
            mistake={mistake}
            images={imagesByMistake.get(mistake.id) ?? []}
            taxonomyMap={taxonomyMap}
            onArchive={onArchive}
            footer={
              <div className="review-actions">
                {(['forgot', 'struggled', 'remembered', 'mastered'] as ReviewResult[]).map((result) => (
                  <MotionTapButton key={result} type="button" onClick={() => onReviewed(mistake, result)}>
                    {reviewResultLabel[result]}
                  </MotionTapButton>
                ))}
              </div>
            }
          />
        ))}
      </AnimatePresence>
      {dueMistakes.length === 0 && <EmptyState icon={<Check />} title="今天清空" text="没有到期错题。" />}
    </section>
  );
}

function GaokaoCard({ examYear }: { examYear: number }) {
  const countdown = getGaokaoCountdown(examYear);
  return (
    <motion.section className="gaokao-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={springSoft}>
      <div>
        <p className="eyebrow">高考倒计时</p>
        <h2>{examYear} 高考</h2>
      </div>
      <div className="countdown-grid">
        <CountdownUnit value={countdown.days} label="天" />
        <CountdownUnit value={countdown.hours} label="时" />
        <CountdownUnit value={countdown.minutes} label="分" />
      </div>
    </motion.section>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="countdown-unit">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.strong
          key={value}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={fadeSlide}
        >
          {value}
        </motion.strong>
      </AnimatePresence>
      <span>{label}</span>
    </div>
  );
}

function ImportView({
  settings,
  taxonomiesByType,
  draft,
  onDraftChange,
  questionImages,
  answerImages,
  onQuestionImagesChange,
  onAnswerImagesChange,
  onSaved
}: {
  settings: AppSettings;
  taxonomiesByType: Record<TaxonomyType, TaxonomyOption[]>;
  draft: MistakeDraft;
  onDraftChange: Dispatch<SetStateAction<MistakeDraft>>;
  questionImages: PendingImage[];
  answerImages: PendingImage[];
  onQuestionImagesChange: Dispatch<SetStateAction<PendingImage[]>>;
  onAnswerImagesChange: Dispatch<SetStateAction<PendingImage[]>>;
  onSaved: () => Promise<void>;
}) {
  const questionInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const defaultSubjectId = taxonomiesByType.subject[0]?.id || '';
  const defaultCauseId = taxonomiesByType.cause[0]?.id || '';

  useEffect(() => {
    onDraftChange((current) => ({
      ...current,
      subjectId: current.subjectId || defaultSubjectId,
      causeId: current.causeId || defaultCauseId
    }));
  }, [defaultCauseId, defaultSubjectId, onDraftChange]);

  const addFiles = (files: File[], role: ImageRole) => {
    const pending = files
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    if (role === 'question') onQuestionImagesChange((current) => [...current, ...pending]);
    else onAnswerImagesChange((current) => [...current, ...pending]);
  };

  const handlePickNative = async (role: ImageRole) => {
    try {
      const picked = await pickImagesFromDevice();
      addFiles(picked, role);
    } catch (err) {
      if (role === 'question') questionInputRef.current?.click();
      else answerInputRef.current?.click();
      setError(err instanceof Error ? err.message : '相册打开失败');
    }
  };

  const handleCamera = async (role: ImageRole) => {
    try {
      const photo = await takePhotoFromCamera();
      addFiles([photo], role);
    } catch (err) {
      setError(err instanceof Error ? err.message : '拍照失败');
    }
  };

  const removePending = (id: string, role: ImageRole) => {
    const removeFrom = (list: PendingImage[]) => {
      const target = list.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return list.filter((image) => image.id !== id);
    };
    if (role === 'question') onQuestionImagesChange(removeFrom);
    else onAnswerImagesChange(removeFrom);
  };

  const processImages = async (list: PendingImage[], role: ImageRole) => {
    return Promise.all(
      list.map(async ({ file }) => {
        const main = await compressImage(file, settings.imageMaxSize, settings.imageQuality);
        const thumb = await compressImage(file, settings.thumbnailMaxSize, 0.78);
        return {
          role,
          imageBlob: main.blob,
          thumbnailBlob: thumb.blob,
          width: main.width,
          height: main.height
        };
      })
    );
  };

  const handleSave = async () => {
    if (questionImages.length === 0) {
      setError('先导入题目图片');
      return;
    }
    if (!draft.subjectId || !draft.causeId || !draft.sourceName.trim()) {
      setError('科目、错因、题源都要填写');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const processed = [
        ...(await processImages(questionImages, 'question')),
        ...(await processImages(answerImages, 'answer'))
      ];
      await addMistake(draft, processed);
      releasePendingImages(questionImages);
      releasePendingImages(answerImages);
      onQuestionImagesChange([]);
      onAnswerImagesChange([]);
      onDraftChange(emptyDraft);
      window.localStorage.removeItem(IMPORT_DRAFT_KEY);
      await db.draftImages.clear();
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stack">
      <SectionHeading title="导入错题" meta={`${questionImages.length + answerImages.length} 张图片`} />
      <input ref={questionInputRef} hidden type="file" accept="image/*" multiple onChange={(event) => addFiles(Array.from(event.target.files ?? []), 'question')} />
      <input ref={answerInputRef} hidden type="file" accept="image/*" multiple onChange={(event) => addFiles(Array.from(event.target.files ?? []), 'answer')} />

      <ImagePickerPanel
        title="题目图片"
        images={questionImages}
        onGallery={() => handlePickNative('question')}
        onCamera={() => handleCamera('question')}
        onRemove={(id) => removePending(id, 'question')}
      />

      <div className="form-grid">
        <TextInput label="标题" value={draft.title} placeholder="可不填" onChange={(title) => onDraftChange({ ...draft, title })} />
        <SelectInput label="科目" value={draft.subjectId} options={taxonomiesByType.subject} onChange={(subjectId) => onDraftChange({ ...draft, subjectId })} />
        <SelectInput label="错因" value={draft.causeId} options={taxonomiesByType.cause} onChange={(causeId) => onDraftChange({ ...draft, causeId })} />
        <SourceInput
          value={draft.sourceName}
          options={taxonomiesByType.source}
          onChange={(sourceName) => onDraftChange({ ...draft, sourceName, sourceId: '' })}
          onPick={(option) => onDraftChange({ ...draft, sourceId: option.id, sourceName: option.name })}
        />
        <label className="field">
          <span>难度</span>
          <div className="segmented">
            {(['hard', 'medium', 'easy'] as Difficulty[]).map((difficulty) => (
              <MotionTapButton
                key={difficulty}
                type="button"
                className={draft.difficulty === difficulty ? 'selected' : ''}
                onClick={() => onDraftChange({ ...draft, difficulty })}
              >
                {difficultyLabel[difficulty]}
              </MotionTapButton>
            ))}
          </div>
        </label>
        <TextArea label="备注" value={draft.note} onChange={(note) => onDraftChange({ ...draft, note })} />
        <AnswerField
          value={draft.answer}
          images={answerImages}
          onChange={(answer) => onDraftChange({ ...draft, answer })}
          onGallery={() => handlePickNative('answer')}
          onCamera={() => handleCamera('answer')}
          onRemove={(id) => removePending(id, 'answer')}
        />
        <TextArea label="启发" value={draft.inspiration} onChange={(inspiration) => onDraftChange({ ...draft, inspiration })} />
      </div>

      {error && <p className="form-error">{error}</p>}
      <MotionTapButton className="primary-action" type="button" disabled={saving} onClick={handleSave}>
        {saving ? '保存中' : '存入错题本'}
      </MotionTapButton>
    </section>
  );
}

function ImagePickerPanel({
  title,
  images,
  onGallery,
  onCamera,
  onRemove
}: {
  title: string;
  images: PendingImage[];
  onGallery: () => void;
  onCamera: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <motion.div className="import-panel" transition={springSoft}>
      <div className="panel-title">
        <h2>{title}</h2>
        <span>{images.length} 张</span>
      </div>
      <div className="import-actions">
        <MotionTapButton type="button" onClick={onGallery}>
          <Images size={18} />
          从相册导入
        </MotionTapButton>
        <MotionTapButton type="button" onClick={onCamera}>
          <Camera size={18} />
          拍照
        </MotionTapButton>
      </div>
      <PreviewGrid images={images} onRemove={onRemove} />
    </motion.div>
  );
}

function AnswerField({
  value,
  images,
  onChange,
  onGallery,
  onCamera,
  onRemove
}: {
  value: string;
  images: PendingImage[];
  onChange: (value: string) => void;
  onGallery: () => void;
  onCamera: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="field full answer-field">
      <span>答案</span>
      <textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} />
      <div className="answer-image-tools">
        <MotionTapButton type="button" onClick={onGallery}>
          <Images size={18} />
          从相册导入
        </MotionTapButton>
        <MotionTapButton type="button" onClick={onCamera}>
          <Camera size={18} />
          拍照
        </MotionTapButton>
      </div>
      <PreviewGrid images={images} onRemove={onRemove} />
    </div>
  );
}

function PreviewGrid({ images, onRemove }: { images: PendingImage[]; onRemove: (id: string) => void }) {
  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(null);

  return (
    <>
      <motion.div className="preview-grid">
        <AnimatePresence initial={false}>
          {images.map((image, index) => (
            <motion.div
              className="preview-tile"
              key={image.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springSoft}
            >
              <MotionTapButton
                className="preview-open"
                type="button"
                onClick={() => setViewer({ src: image.url, title: `导入图片 ${index + 1}` })}
                aria-label={`放大预览导入图片 ${index + 1}`}
              >
                <img src={image.url} alt="导入预览" />
              </MotionTapButton>
              <MotionTapButton className="preview-remove" type="button" onClick={() => onRemove(image.id)} aria-label="删除图片">
                <Trash2 size={15} />
              </MotionTapButton>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      <ImageLightbox image={viewer} onClose={() => setViewer(null)} />
    </>
  );
}

function SourceInput({
  value,
  options,
  onChange,
  onPick
}: {
  value: string;
  options: TaxonomyOption[];
  onChange: (value: string) => void;
  onPick: (option: TaxonomyOption) => void;
}) {
  return (
    <label className="field full">
      <span>题源</span>
      <input value={value} placeholder="例如：一模试卷第12题" onChange={(event) => onChange(event.target.value)} />
      <div className="quick-row">
        {options.map((option) => (
          <MotionTapButton key={option.id} type="button" className={value === option.name ? 'selected' : ''} onClick={() => onPick(option)}>
            {option.name}
          </MotionTapButton>
        ))}
      </div>
    </label>
  );
}

function GalleryView({
  mistakes,
  imagesByMistake,
  taxonomyMap,
  taxonomiesByType,
  onArchive
}: {
  mistakes: MistakeItem[];
  imagesByMistake: Map<string, ImageAsset[]>;
  taxonomyMap: Map<string, string>;
  taxonomiesByType: Record<TaxonomyType, TaxonomyOption[]>;
  onArchive: (mistake: MistakeItem) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [causeId, setCauseId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const difficultyOptions = [
    { id: '', name: '全部难度' },
    ...(['hard', 'medium', 'easy'] as Difficulty[]).map((item) => ({ id: item, name: difficultyLabel[item] }))
  ];

  const filtered = mistakes.filter((mistake) => {
    const text = `${mistake.title} ${mistake.note} ${mistake.answer} ${mistake.inspiration} ${mistake.sourceName}`.toLowerCase();
    return (
      (!query.trim() || text.includes(query.trim().toLowerCase())) &&
      (!subjectId || mistake.subjectId === subjectId) &&
      (!causeId || mistake.causeId === causeId) &&
      (!difficulty || mistake.difficulty === difficulty)
    );
  });

  return (
    <section className="stack">
      <SectionHeading title="错题画廊" meta={`${filtered.length} 道`} />
      <div className="search-box">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、备注、题源、答案、启发" />
      </div>
      <div className="filter-row">
        <MiniSelect value={subjectId} options={taxonomiesByType.subject} placeholder="全部科目" onChange={setSubjectId} />
        <MiniSelect value={causeId} options={taxonomiesByType.cause} placeholder="全部错因" onChange={setCauseId} />
        <ChoiceInput value={difficulty} options={difficultyOptions} placeholder="全部难度" onChange={setDifficulty} />
      </div>
      <motion.div className="gallery-grid">
        <AnimatePresence initial={false}>
          {filtered.map((mistake) => (
            <MistakeCard
              key={mistake.id}
              mistake={mistake}
              compact
              images={imagesByMistake.get(mistake.id) ?? []}
              taxonomyMap={taxonomyMap}
              onArchive={onArchive}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      {filtered.length === 0 && <EmptyState icon={<MoreHorizontal />} title="没找到" text="换个筛选试试。" />}
    </section>
  );
}

function CalendarView({
  mistakes,
  imagesByMistake,
  taxonomyMap,
  selectedDate,
  onSelectDate
}: {
  mistakes: MistakeItem[];
  imagesByMistake: Map<string, ImageAsset[]>;
  taxonomyMap: Map<string, string>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];
  const todayKey = toDateKey(new Date());
  const days = useMemo(() => {
    const today = startOfToday();
    const start = new Date(today);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, []);

  const visibleMonth = useMemo(() => {
    const middle = days[14] ?? new Date();
    return `${middle.getFullYear()}年${middle.getMonth() + 1}月`;
  }, [days]);

  const selectedLabel = useMemo(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    return `${date.getMonth() + 1}月${date.getDate()}日 周${weekLabels[(date.getDay() + 6) % 7]}`;
  }, [selectedDate]);

  const upcomingDays = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });
  }, []);

  const countByDay = useMemo(() => {
    const map = new Map<string, number>();
    mistakes.forEach((mistake) => {
      const key = toDateKey(mistake.nextReviewAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [mistakes]);

  const selectedMistakes = mistakes.filter((mistake) => toDateKey(mistake.nextReviewAt) === selectedDate);
  const upcomingCount = upcomingDays.reduce((total, date) => total + (countByDay.get(toDateKey(date)) ?? 0), 0);

  return (
    <section className="stack">
      <SectionHeading title="复习日历" meta={`未来35天 ${upcomingCount} 道`} />
      <motion.div className="calendar-panel" transition={springSoft}>
        <div className="calendar-head">
          <div>
            <p className="eyebrow">{visibleMonth}</p>
            <h2>{selectedLabel}</h2>
          </div>
          <span>{selectedMistakes.length} 道</span>
        </div>
        <div className="calendar-weekdays">
          {weekLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
        <motion.div className="calendar-grid">
          {days.map((date) => {
            const key = toDateKey(date);
            const count = countByDay.get(key) ?? 0;
            const className = [
              key === selectedDate ? 'selected' : '',
              key === todayKey ? 'today' : '',
              count > 0 ? 'has-count' : ''
            ].filter(Boolean).join(' ');
            return (
              <MotionTapButton key={key} type="button" className={className} onClick={() => onSelectDate(key)}>
                <span>{date.getDate()}</span>
                <small>{count || ''}</small>
              </MotionTapButton>
            );
          })}
        </motion.div>
      </motion.div>
      <div className="stack">
        {selectedMistakes.map((mistake) => (
          <MistakeCard key={mistake.id} mistake={mistake} compact images={imagesByMistake.get(mistake.id) ?? []} taxonomyMap={taxonomyMap} />
        ))}
        {selectedMistakes.length === 0 && <EmptyState icon={<CalendarDays />} title="这天没有安排" text="日历会随着复习自动变化。" />}
      </div>
    </section>
  );
}

function SettingsView({
  settings,
  taxonomiesByType,
  onRefresh,
  onExport,
  onImport,
  onToast
}: {
  settings: AppSettings;
  taxonomiesByType: Record<TaxonomyType, TaxonomyOption[]>;
  onRefresh: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onToast: (message: string) => void;
}) {
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<SettingsPanel | null>('learning');
  const [examYear, setExamYear] = useState(`${settings.examYear}`);
  const [intervalText, setIntervalText] = useState(settings.reviewIntervals.join(', '));
  const [newNames, setNewNames] = useState<Record<TaxonomyType, string>>({ subject: '', cause: '', source: '' });
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([settings.examYear]);
    for (let year = currentYear; year <= currentYear + 10; year += 1) years.add(year);
    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => ({ id: `${year}`, name: `${year} 年` }));
  }, [settings.examYear]);

  useEffect(() => {
    setExamYear(`${settings.examYear}`);
    setIntervalText(settings.reviewIntervals.join(', '));
  }, [settings]);

  const parsedIntervals = parseIntervals(intervalText, settings.reviewIntervals);

  const handleSaveExamYear = async () => {
    const nextYear = Number(examYear) || settings.examYear;
    await updateSettings({ examYear: nextYear });
    await onRefresh();
    onToast('高考年份已保存');
  };

  const handleSaveIntervals = async () => {
    await updateSettings({ reviewIntervals: parsedIntervals });
    await onRefresh();
  };

  const handleAdd = async (type: TaxonomyType) => {
    await addTaxonomy(type, newNames[type]);
    setNewNames({ ...newNames, [type]: '' });
    await onRefresh();
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    await onImport(file);
  };

  return (
    <section className="stack">
      <SectionHeading title="设置" meta="本机保存" />
      <SettingsAccordion icon={<GraduationCap />} title="学习信息" open={open === 'learning'} onToggle={() => setOpen(open === 'learning' ? null : 'learning')}>
        <div className="settings-form-row">
          <ChoiceInput label="高考年份" value={examYear} options={yearOptions} onChange={setExamYear} />
          <MotionTapButton type="button" className="mini-primary" onClick={handleSaveExamYear}>保存</MotionTapButton>
        </div>
      </SettingsAccordion>

      <SettingsAccordion icon={<Tags />} title="分类快捷项" open={open === 'taxonomy'} onToggle={() => setOpen(open === 'taxonomy' ? null : 'taxonomy')}>
        {(['subject', 'cause', 'source'] as TaxonomyType[]).map((type) => (
          <div className="settings-subblock" key={type}>
            <h3>{taxonomyTitles[type]}</h3>
            <div className="add-row">
              <input value={newNames[type]} onChange={(event) => setNewNames({ ...newNames, [type]: event.target.value })} placeholder={`新增${taxonomyTitles[type]}`} />
              <MotionTapButton type="button" onClick={() => handleAdd(type)} aria-label={`新增${taxonomyTitles[type]}`}>
                <Plus size={18} />
              </MotionTapButton>
            </div>
            <div className="taxonomy-list">
              {taxonomiesByType[type].map((item) => <TaxonomyEditor key={item.id} item={item} onRefresh={onRefresh} />)}
            </div>
          </div>
        ))}
      </SettingsAccordion>

      <SettingsAccordion icon={<SlidersHorizontal />} title="复习策略" open={open === 'review'} onToggle={() => setOpen(open === 'review' ? null : 'review')}>
        <label className="field">
          <span>复习间隔</span>
          <input value={intervalText} onChange={(event) => setIntervalText(event.target.value)} placeholder="1, 2, 4, 7, 15, 30, 60" />
        </label>
        <ReviewPreview intervals={parsedIntervals} />
        <MotionTapButton type="button" className="mini-primary" onClick={handleSaveIntervals}>保存策略</MotionTapButton>
      </SettingsAccordion>

      <SettingsAccordion icon={<Download />} title="数据备份" open={open === 'backup'} onToggle={() => setOpen(open === 'backup' ? null : 'backup')}>
        <input hidden ref={backupInputRef} type="file" accept="application/json" onChange={(event) => handleImportFile(event.target.files?.[0])} />
        <div className="backup-actions">
          <MotionTapButton type="button" onClick={onExport}>
            <Download size={18} />
            导出
          </MotionTapButton>
          <MotionTapButton type="button" onClick={() => backupInputRef.current?.click()}>
            <RotateCcw size={18} />
            恢复
          </MotionTapButton>
        </div>
      </SettingsAccordion>

      <SettingsAccordion icon={<Database />} title="本地存储" open={open === 'storage'} onToggle={() => setOpen(open === 'storage' ? null : 'storage')}>
        <div className="storage-copy">
          <p>错题、复习记录和设置保存在手机本机 IndexedDB。</p>
          <p>题目图片和答案图片以 Blob 形式离线保存。</p>
          <p>备份会导出包含文字和图片的 JSON 文件。</p>
        </div>
      </SettingsAccordion>
    </section>
  );
}

function SettingsAccordion({
  icon,
  title,
  open,
  onToggle,
  children
}: {
  icon: JSX.Element;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <motion.article className="settings-row" transition={springSoft}>
      <MotionTapButton type="button" className="settings-row-head" onClick={onToggle}>
        <span className="settings-row-icon">{icon}</span>
        <span>{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={springSnappy}>
          <ChevronDown size={18} />
        </motion.span>
      </MotionTapButton>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="settings-row-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            <div>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function ReviewPreview({ intervals }: { intervals: number[] }) {
  const sampleStage = Math.min(2, Math.max(0, intervals.length - 1));
  return (
    <div className="review-preview">
      <div className="interval-chips">
        {intervals.map((day, index) => (
          <motion.span key={`${day}-${index}`} transition={springSoft}>第{index + 1}轮 {day}天</motion.span>
        ))}
      </div>
      <div className="preview-results">
        {(['forgot', 'struggled', 'remembered', 'mastered'] as ReviewResult[]).map((result) => {
          const plan = getReviewPlan(sampleStage, result, intervals);
          return (
            <motion.div key={result}>
              <b>{reviewResultLabel[result]}</b>
              <span>{formatShortDate(plan.nextReviewAt)}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TaxonomyEditor({ item, onRefresh }: { item: TaxonomyOption; onRefresh: () => Promise<void> }) {
  const [name, setName] = useState(item.name);

  return (
    <motion.div className="taxonomy-item" transition={springSoft}>
      <input value={name} onChange={(event) => setName(event.target.value)} onBlur={async () => {
        await renameTaxonomy(item.id, name);
        await onRefresh();
      }} />
      <MotionTapButton type="button" onClick={async () => {
        await deleteTaxonomy(item.id);
        await onRefresh();
      }} aria-label="删除">
        <Trash2 size={16} />
      </MotionTapButton>
    </motion.div>
  );
}

function MistakeCard({
  mistake,
  images,
  taxonomyMap,
  compact = false,
  footer,
  onArchive
}: {
  mistake: MistakeItem;
  images: ImageAsset[];
  taxonomyMap: Map<string, string>;
  compact?: boolean;
  footer?: JSX.Element;
  onArchive?: (mistake: MistakeItem) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const subjectName = (taxonomyMap.get(mistake.subjectId) ?? mistake.subjectName) || '科目';
  const causeName = (taxonomyMap.get(mistake.causeId) ?? mistake.causeName) || '错因';
  const sourceName = mistake.sourceName || taxonomyMap.get(mistake.sourceId) || '题源';
  const title = mistake.title.trim() || `${subjectName}错题`;
  const questionImages = images.filter((image) => (image.role ?? 'question') === 'question');
  const answerImages = images.filter((image) => image.role === 'answer');

  return (
    <motion.article
      className={`mistake-card ${compact ? 'compact' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={springSoft}
    >
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          <div className="meta-row">
            <span>{subjectName}</span>
            <span>{causeName}</span>
            <span>{sourceName}</span>
            <span>{formatShortDate(mistake.nextReviewAt)}</span>
          </div>
        </div>
        {onArchive && (
          <MotionTapButton type="button" className="icon-button" onClick={() => onArchive(mistake)} aria-label="归档">
            <Archive size={18} />
          </MotionTapButton>
        )}
      </div>
      <ImageStrip images={questionImages} />
      {mistake.note && <p className="note">{mistake.note}</p>}
      {(mistake.answer || mistake.inspiration || answerImages.length > 0) && (
        <motion.details className="answer-box" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary>
            答案和启发
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={springSnappy}>
              <ChevronDown size={16} />
            </motion.span>
          </summary>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fadeSlide}>
                {mistake.answer && <p><b>答案</b>{mistake.answer}</p>}
                {answerImages.length > 0 && (
                  <div className="answer-image-block">
                    <b>答案图片</b>
                    <ImageStrip images={answerImages} />
                  </div>
                )}
                {mistake.inspiration && <p><b>启发</b>{mistake.inspiration}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.details>
      )}
      {footer}
    </motion.article>
  );
}

function ImageStrip({ images }: { images: ImageAsset[] }) {
  const [urls, setUrls] = useState<Array<{ thumb: string; full: string }>>([]);
  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    const nextUrls = images.map((image) => ({
      thumb: URL.createObjectURL(image.thumbnailBlob),
      full: URL.createObjectURL(image.imageBlob)
    }));
    setUrls(nextUrls);
    return () => nextUrls.forEach((url) => {
      URL.revokeObjectURL(url.thumb);
      URL.revokeObjectURL(url.full);
    });
  }, [images]);

  if (urls.length === 0) return null;

  return (
    <>
      <motion.div className="image-strip">
        {urls.map((url, index) => (
          <MotionTapButton
            key={url.thumb}
            type="button"
            onClick={() => setViewer({ src: url.full, title: `错题图片 ${index + 1}` })}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={springSoft}
          >
            <img src={url.thumb} alt={`错题图片 ${index + 1}`} />
          </MotionTapButton>
        ))}
      </motion.div>
      <ImageLightbox image={viewer} onClose={() => setViewer(null)} />
    </>
  );
}

function SectionHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {meta && <span>{meta}</span>}
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: JSX.Element; title: string; text: string }) {
  return (
    <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={springSoft}>
      {icon}
      <h2>{title}</h2>
      <p>{text}</p>
    </motion.div>
  );
}

function TextInput({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field full">
      <span>{label}</span>
      <textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface ChoiceOption {
  id: string;
  name: string;
}

function ChoiceInput({
  label,
  value,
  options,
  placeholder = '请选择',
  onChange
}: {
  label?: string;
  value: string;
  options: ChoiceOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  return (
    <div className={label ? 'field' : 'choice-standalone'}>
      {label && <span>{label}</span>}
      <MotionTapButton type="button" className="choice-trigger" onClick={() => setOpen(true)}>
        <span className={!selected ? 'placeholder' : ''}>{selected?.name ?? placeholder}</span>
        <ChevronDown size={18} />
      </MotionTapButton>
      <AnimatePresence>
        {open && (
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeSlide}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="choice-sheet"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={springSoft}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="choice-sheet-head">
                <h2>{label ?? placeholder}</h2>
                <MotionTapButton type="button" onClick={() => setOpen(false)}>完成</MotionTapButton>
              </div>
              <div className="choice-list">
                {options.map((option) => (
                  <MotionTapButton
                    key={option.id}
                    type="button"
                    className={option.id === value ? 'selected' : ''}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    <span>{option.name}</span>
                    {option.id === value && <Check size={18} />}
                  </MotionTapButton>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: TaxonomyOption[]; onChange: (value: string) => void }) {
  return <ChoiceInput label={label} value={value} options={options} onChange={onChange} />;
}

function MiniSelect({ value, options, placeholder, onChange }: { value: string; options: TaxonomyOption[]; placeholder: string; onChange: (value: string) => void }) {
  return <ChoiceInput value={value} options={[{ id: '', name: placeholder }, ...options]} placeholder={placeholder} onChange={onChange} />;
}

function ImageLightbox({ image, onClose }: { image: { src: string; title: string } | null; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const clampScale = (value: number) => Math.min(4, Math.max(1, Number(value.toFixed(2))));
  const touchDistance = (touches: React.TouchList) => {
    const first = touches[0];
    const second = touches[1];
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };
  const updateScale = (next: number | ((value: number) => number)) => {
    setScale((current) => {
      const value = clampScale(typeof next === 'function' ? next(current) : next);
      if (value === 1) setOffset({ x: 0, y: 0 });
      return value;
    });
  };

  useEffect(() => {
    if (!image) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pinchRef.current = null;
    panRef.current = null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  const lightbox = (
    <AnimatePresence>
      <motion.div
        className="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fadeSlide}
      >
        <div className="lightbox-toolbar">
          <MotionTapButton type="button" onClick={() => updateScale((value) => value - 0.25)}>缩小</MotionTapButton>
          <span>{Math.round(scale * 100)}%</span>
          <MotionTapButton type="button" onClick={() => updateScale((value) => value + 0.25)}>放大</MotionTapButton>
          <MotionTapButton type="button" className="lightbox-close" onClick={onClose} aria-label="关闭预览">关闭</MotionTapButton>
        </div>
        <div
          className="lightbox-stage"
          onWheel={(event) => {
            event.preventDefault();
            updateScale((value) => value + (event.deltaY < 0 ? 0.15 : -0.15));
          }}
          onTouchStart={(event) => {
            if (event.touches.length === 2) {
              pinchRef.current = { distance: touchDistance(event.touches), scale };
              panRef.current = null;
              return;
            }
            if (event.touches.length === 1 && scale > 1) {
              const touch = event.touches[0];
              panRef.current = { x: touch.clientX, y: touch.clientY, offsetX: offset.x, offsetY: offset.y };
            }
          }}
          onTouchMove={(event) => {
            if (event.touches.length === 2 && pinchRef.current) {
              event.preventDefault();
              const nextDistance = touchDistance(event.touches);
              updateScale(pinchRef.current.scale * (nextDistance / pinchRef.current.distance));
              return;
            }
            if (event.touches.length !== 1 || !panRef.current || scale <= 1) return;
            event.preventDefault();
            const touch = event.touches[0];
            setOffset({
              x: panRef.current.offsetX + touch.clientX - panRef.current.x,
              y: panRef.current.offsetY + touch.clientY - panRef.current.y
            });
          }}
          onTouchEnd={() => {
            pinchRef.current = null;
            panRef.current = null;
          }}
          onMouseDown={(event) => {
            if (scale <= 1) return;
            panRef.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
          }}
          onMouseMove={(event) => {
            if (!panRef.current || scale <= 1) return;
            setOffset({
              x: panRef.current.offsetX + event.clientX - panRef.current.x,
              y: panRef.current.offsetY + event.clientY - panRef.current.y
            });
          }}
          onMouseUp={() => {
            panRef.current = null;
          }}
          onMouseLeave={() => {
            panRef.current = null;
          }}
        >
          <img
            src={image.src}
            alt={image.title}
            className={scale > 1 ? 'pannable' : ''}
            style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(lightbox, document.body);
}

function MotionTapButton({
  children,
  ...props
}: ComponentProps<typeof motion.button> & { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      {...props}
      whileTap={props.disabled || reducedMotion ? undefined : { scale: 0.98 }}
      transition={reducedMotion ? { duration: 0 } : springSnappy}
    >
      {children}
    </motion.button>
  );
}

function parseIntervals(value: string, fallback: number[]) {
  const parsed = value
    .split(/[\s,，、]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.min(365, Math.round(item)));
  return parsed.length ? parsed : fallback;
}

export default App;
