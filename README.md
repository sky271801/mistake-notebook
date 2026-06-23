# 错题本 App

一个离线个人错题本，先做安卓 APK，核心功能也可以在浏览器里预览。

## 功能

- 多图导入错题
- 科目、错因、题源自定义
- 答案和启发折叠查看
- 按复习结果自动安排下次复习
- 错题画廊、筛选、搜索、复习日历
- 本地备份和恢复
- 高考倒计时，可设置高考年份
- 复习周期自定义和策略预览
- 题源可手动输入，设置页只维护快捷题源
- 答案支持文字、相册图片和拍照图片
- Apple-like 轻量动效和移动端浅色配色

## 开发命令

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run test
```

## 安卓打包

这台电脑已经装好 JDK 21 和 Android SDK 35。以后重新打 debug APK，运行：

```bash
npm.cmd run apk:debug
```

生成文件：

```text
cuotiben-debug.apk
```

中文名副本：

```text
错题本-debug.apk
```

## 存储方式

App 不使用后端。错题、分类、复习记录、复习周期和高考年份保存在手机本机 IndexedDB；题目图片和答案图片以 Blob 形式离线保存。备份会导出一个包含文字和图片数据的 JSON 文件。

也可以打开 Android Studio 工程：

```bash
npm.cmd run cap:open
```
