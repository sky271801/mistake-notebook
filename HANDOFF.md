# 错题本 App 开发交接记录

更新时间：2026-06-23

## 用户目标与偏好

- 用户是代码新手，希望有人直接帮忙开发、打包和安装。
- 目标是一个个人自用、移动端优先、无后端的安卓错题本 App。
- 第一版不需要 OCR，图片就是题目主体；未来可能考虑“自动去笔迹”。
- 风格要求：
  - “去 AI 味”，像真正个人学习工具。
  - 现代化，移动端好用。
  - 配色参考：https://www.ysdaima.com/palettes/ui-4c-mobile-light/
  - 想要 Apple-like 的丝滑体验，但实际手机反馈说之前动画卡，所以当前策略是减少重动画，保留轻触感。
  - UI 不要太直角，要适当圆角、悬浮、局部 blur。

## 当前技术栈

- React 18 + TypeScript + Vite
- Capacitor 7 Android
- Dexie / IndexedDB 本地存储
- Capacitor Camera：相册多选、拍照
- lucide-react 图标
- motion：轻量页面/按钮/图片动效
- Vitest + jsdom 测试

`package.json` 关键脚本：

```bash
npm.cmd run dev
npm.cmd run test
npm.cmd run build
npm.cmd run apk:debug
npm.cmd run cap:open
```

注意：Windows PowerShell 对 `npm.ps1` 有执行策略限制，所以一直使用 `npm.cmd`。

## 已实现功能

- 安卓 APK 项目已生成，可打 debug 包。
- 底部导航：今日、导入、画廊、日历、设置。
- 首页：
  - 今日复习列表。
  - 高考倒计时。
  - 高考年份可在设置页修改。
- 导入页：
  - 题目图片：从相册导入、多选、拍照、预览、删除。
  - 答案图片：从相册导入、多选、拍照、预览、删除。
  - 科目、错因使用快捷选项。
  - 题源支持手动输入；设置页只维护题源快捷项。
  - 答案和启发是文字输入。
- 错题卡：
  - 题目图片显示在题目区域。
  - 答案图片放在“答案”下面、“启发”上面，并有“答案图片”标题。
  - 答案和启发折叠显示。
- 复习系统：
  - 默认间隔：`1, 2, 4, 7, 15, 30, 60` 天。
  - 导入时按困难/一般/简单生成首次复习日。
  - 复习按钮：忘了、吃力、记住、很熟。
  - 设置页可以编辑复习周期并预览策略。
- 画廊：
  - 错题网格展示。
  - 支持按科目、错因筛选。
  - 支持搜索标题、备注、题源、答案、启发。
- 日历：
  - 显示未来 35 天复习安排。
- 设置页：
  - 已改成分条折叠。
  - 学习信息、分类快捷项、复习策略、数据备份、本地存储。
- 备份/恢复：
  - 导出 JSON，包含文字、设置、复习记录、图片数据。
  - 恢复时写回 IndexedDB。

## 本地存储方式

App 不使用后端。所有内容保存在手机 WebView 的 IndexedDB 数据库 `cuotibenapp` 中。

- `mistakes`：错题文字、分类、难度、复习阶段、下次复习日期。
- `images`：图片 Blob、缩略图 Blob、尺寸、角色。
- `taxonomies`：科目、错因、题源快捷项。
- `reviewLogs`：复习记录。
- `settings`：复习周期、高考年份、图片压缩设置。

`ImageAsset.role`：

```ts
type ImageRole = 'question' | 'answer';
```

旧图片会在 Dexie v2 迁移中自动补成 `question`。

## 数据模型与迁移

主要文件：

- `src/types.ts`
- `src/data/db.ts`
- `src/data/backup.ts`
- `src/lib/review.ts`
- `src/lib/exam.ts`
- `src/lib/images.ts`

数据库版本：

- v1：最初结构。
- v2：`images` 增加 `role` 索引，`settings` 增加 `examYear`，旧错题补 `sourceName`。

高考倒计时规则：

- 目标时间固定为设置年份的 `6月7日 09:00`。
- 默认年份：如果当天已过当年 6月7日 09:00，则默认下一年。

## UI 与动效当前状态

Figma：

- 已创建 Figma 草稿文件：https://www.figma.com/design/4cs6sv1bPOlcJKhVjf5IDV
- Figma 可用库里有 Material 3、Simple Design System、iOS 18、iOS/iPadOS 26 等。
- 搜索 iOS/card/navigation/blur/list/settings 没有直接返回可复用组件，所以当前主要把设计方向落到代码里。

当前 UI 策略：

- 使用白、浅灰、蓝、深灰。
- 圆角变量：
  - `--radius-card: 22px`
  - `--radius-control: 16px`
  - `--radius-small: 12px`
- 底部导航是悬浮胶囊，有 blur 和阴影。
- 顶栏和高考倒计时卡有静态 blur。
- 已避免动画中的 `filter: blur()`，因为 Android WebView 上容易卡。
- 已去掉大面积 `layout` 动画，保留按钮按压、页面轻淡入、图片轻入场。

用户最近反馈：

- “动画卡卡的。”
- “UI 直角太生硬，适当来点圆角，考虑搞点 blur 或者悬浮。”
- “答案图片你放答案那里啊，为什么放启发下面。”
- “用 Figma 美化或者重构这个软件画风，现代化一点。”

本轮已经针对这些反馈做了：

- 降低动画强度。
- 去掉动画 blur 和大范围 layout 补间。
- 增加圆角、悬浮底栏、静态 blur。
- 答案图片移动到答案下方、启发上方。
- 创建 Figma 草稿文件并记录设计方向。

## Android 打包环境

已安装：

- JDK 21：`C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`
- Android SDK：`C:\Users\Sky\AppData\Local\Android\Sdk`
- Android SDK 35
- build-tools 35.0.0
- platform-tools

还装过 JDK 17，但实际 Capacitor Android 7 编译需要 JDK 21。

打包脚本：

- `scripts/build-debug-apk.cmd`

这个脚本会：

1. 设置 `JAVA_HOME`
2. 设置 `ANDROID_HOME`
3. 运行 `npm.cmd run cap:sync`
4. 运行 Gradle `assembleDebug`
5. 复制 APK 为 `cuotiben-debug.apk`

Capacitor 中文名修复脚本：

- `scripts/fix-android-strings.mjs`

原因：Windows 下 `cap sync` 曾把 Android `strings.xml` 的中文应用名写成乱码。现在 `cap:sync` 会同步后自动修复。

Gradle Wrapper：

- `android/gradle/wrapper/gradle-wrapper.properties`
- `networkTimeout` 已从 10000 改为 120000。
- 原因：`services.gradle.org` 下载 Gradle 8.11.1 时 10 秒超时。
- 后来用 `https://downloads.gradle.org/distributions/gradle-8.11.1-all.zip` 手动下载过 Gradle 到 wrapper 缓存。

## 当前 APK

当前 debug APK：

- `C:\Users\Sky\Documents\cuotibenapp\cuotiben-debug.apk`
- `C:\Users\Sky\Documents\cuotibenapp\错题本-debug.apk`

最近一次大小：

- 约 6.8 MB

最近已安装到设备：

- `192.168.1.6:5555`
- 包名：`com.local.cuotiben`

安装命令：

```bash
adb install -r "C:\Users\Sky\Documents\cuotibenapp\cuotiben-debug.apk"
adb shell monkey -p com.local.cuotiben 1
```

## 验证记录

最近验证通过：

```bash
npm.cmd run test
npm.cmd run build
npm.cmd run apk:debug
```

测试现状：

- 2 个测试文件。
- 6 个测试通过。
- 覆盖：
  - 复习调度。
  - 高考年份默认规则。
  - 高考倒计时。

审计曾通过：

```bash
npm.cmd audit --audit-level=moderate
```

结果：0 vulnerabilities。

## 当前仓库状态

这个仓库目前还没有 commit。

`git status --short` 显示所有项目文件都是未跟踪状态，包括：

- `.gitignore`
- `README.md`
- `HANDOFF.md`
- `android/`
- `capacitor.config.ts`
- `index.html`
- `package.json`
- `package-lock.json`
- `scripts/`
- `src/`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`

新对话如果要改代码，不要重置仓库，不要删除这些未跟踪文件。

## 重要文件导览

- `src/App.tsx`
  - 当前主界面几乎都在这里。
  - 包含首页、导入、画廊、日历、设置、错题卡、图片预览。
- `src/styles.css`
  - 当前主要视觉、圆角、blur、悬浮、动效减负样式。
- `src/data/db.ts`
  - Dexie 数据库、默认数据、迁移、设置更新、复习记录。
- `src/data/backup.ts`
  - 备份导出和恢复。
- `src/lib/images.ts`
  - 图片压缩、相册多选、拍照。
- `src/lib/review.ts`
  - 复习周期算法。
- `src/lib/exam.ts`
  - 高考日期与倒计时。
- `src/lib/*.test.ts`
  - 单元测试。
- `scripts/build-debug-apk.cmd`
  - 一键打 debug APK。
- `scripts/fix-android-strings.mjs`
  - 修复 Android 中文应用名。

## 后续开发建议

优先级最高：

1. 让用户在真机上重新试新版，确认动画是否仍卡。
2. 如果仍卡，继续移除 Motion，只保留 CSS transition 和原生点击反馈。
3. 若导入/拍照权限有问题，重点查 `@capacitor/camera` 在 Android 版本上的权限行为。
4. 如果 UI 还不够现代，可继续按 Figma 草稿方向重构为更“学习仪表盘 + 卡片流”的结构。

性能注意：

- Android WebView 对 blur、filter、复杂 layout 动画敏感。
- 不要再给长列表、卡片网格、图片网格加大范围 `layout` 补间。
- blur 尽量只放在固定层，如顶栏和底栏。
- 图片预览动画要轻，避免大面积阴影动画。

可能的结构优化：

- `src/App.tsx` 已经很大，后续可拆成：
  - `views/TodayView.tsx`
  - `views/ImportView.tsx`
  - `views/GalleryView.tsx`
  - `views/CalendarView.tsx`
  - `views/SettingsView.tsx`
  - `components/MistakeCard.tsx`
  - `components/ImagePickerPanel.tsx`

## 新对话继续开发时的建议开场

可以直接说：

> 请先阅读 `HANDOFF.md` 和 `README.md`，接着继续优化错题本 App。重点检查真机动画卡顿、UI 现代化、导入/拍照体验和设置页结构。不要重置仓库，当前文件还没有 commit。

