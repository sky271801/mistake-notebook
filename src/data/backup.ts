import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { DEFAULT_SETTINGS, db, getSettings, replaceAllData } from './db';
import type { BackupPayload, ImageAsset } from '../types';
import { blobToDataUrl, dataUrlToBlob } from '../lib/images';

export const exportBackup = async () => {
  const [mistakes, images, taxonomies, reviewLogs, settings] = await Promise.all([
    db.mistakes.toArray(),
    db.images.toArray(),
    db.taxonomies.toArray(),
    db.reviewLogs.toArray(),
    getSettings()
  ]);

  const payload: BackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    mistakes,
    images: await Promise.all(
      images.map(async ({ imageBlob, thumbnailBlob, ...image }) => ({
        ...image,
        imageDataUrl: await blobToDataUrl(imageBlob),
        thumbnailDataUrl: await blobToDataUrl(thumbnailBlob)
      }))
    ),
    taxonomies,
    reviewLogs,
    settings
  };

  const filename = `错题本备份-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify(payload);

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });
    const file = await Filesystem.getUri({
      path: filename,
      directory: Directory.Cache
    });
    await Share.share({
      title: '保存错题本备份',
      text: '请选择保存位置或发送到文件管理器。',
      url: file.uri,
      dialogTitle: '保存错题本备份'
    });
    return '已打开保存面板';
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return '已导出备份';
};

export const importBackup = async (file: File) => {
  const text = await file.text();
  const payload = JSON.parse(text) as BackupPayload;
  if (payload.version !== 1 && payload.version !== 2) {
    throw new Error('备份版本不支持');
  }

  const images: ImageAsset[] = await Promise.all(
    payload.images.map(async ({ imageDataUrl, thumbnailDataUrl, ...image }) => ({
      ...image,
      role: image.role ?? 'question',
      imageBlob: await dataUrlToBlob(imageDataUrl),
      thumbnailBlob: await dataUrlToBlob(thumbnailDataUrl)
    }))
  );

  const settings = {
    ...DEFAULT_SETTINGS,
    ...payload.settings,
    reviewIntervals: payload.settings.reviewIntervals?.length ? payload.settings.reviewIntervals : DEFAULT_SETTINGS.reviewIntervals
  };

  await replaceAllData(payload.mistakes, images, payload.taxonomies, payload.reviewLogs, settings);
};
