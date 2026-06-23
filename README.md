# Mistake Notebook

一个离线优先的安卓错题本 App。它面向个人学习场景：用图片记录题目，用文字或图片记录答案，按复习结果自动安排下一次复习。

## Features

- 多图导入错题，支持相册多选和拍照。
- 题目图片、答案图片都支持预览、放大、拖动查看。
- 导入页草稿会保存，退出 App 后再次打开仍能恢复未完成内容。
- 科目、错因、题源可自定义。
- 画廊支持搜索和按科目、错因、难度筛选。
- 答案与启发折叠查看。
- 按“忘了 / 吃力 / 记住 / 很熟”记录复习结果，并自动安排下一次复习。
- 复习日历展示未来复习安排。
- 高考倒计时，年份可在设置页选择。
- 复习间隔可自定义，并提供策略预览。
- 本地 JSON 备份与恢复，安卓端导出时可调用系统分享/保存面板。

## Tech Stack

- React 18 + TypeScript
- Vite
- Capacitor 7 Android
- Dexie / IndexedDB
- Capacitor Camera / Filesystem / Share
- lucide-react
- motion
- Vitest + jsdom

## Storage Model

没有后端。所有数据都保存在手机 WebView 的 IndexedDB 里：

- `mistakes`：错题文字、分类、难度、复习阶段、下次复习时间
- `images`：题目图片和答案图片 Blob
- `draftImages`：导入页未保存草稿图片
- `taxonomies`：科目、错因、题源快捷项
- `reviewLogs`：复习记录
- `settings`：复习间隔、高考年份、图片压缩设置

备份功能会导出一个包含文字、设置、复习记录和图片 data URL 的 JSON 文件。
