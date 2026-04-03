# Wrong Notebook Android (离线优先)

一个面向 Android 的错题本应用，核心目标是：**离线可用、APK 可直接打包、网络能力可选增强**。

## ✨ 功能介绍（Android 版）

- **📦 离线优先数据链路**：本地 sqlite 持久化，支持错题创建、编辑、查看与复习。
- **🧠 AI 队列运行时**：本地队列支持 `pending / processing / failed / success` 状态流转与重试。
- **🔁 队列可视化与重试**：Notebook 页面内置队列状态面板，支持一键 retry-all 与运行态反馈。
- **📊 运行遥测信息**：展示最近执行结果（来源、成功/失败计数、跳过原因）。
- **🛡️ 配置兜底机制**：`/api/settings` 不可用时使用本地配置，并向用户展示提示。
- **🌐 在线能力可选**：当网络可用时，可接入兼容的在线 AI provider；离线核心功能不依赖云端。

## 🧱 技术栈

- **应用框架**：Next.js 16 + React 19（App Router）
- **离线存储**：SQLite（Capacitor runtime）
- **离线业务模块**：`src/offline/**`（runtime / queue / config / error-items）
- **UI**：Tailwind CSS v4 + Shadcn UI + Radix
- **测试**：Vitest（含 offline 模块测试）
- **CI 打包**：GitHub Actions Android APK workflow

## 🚀 Android APK 打包（GitHub）

工作流：`.github/workflows/android-apk.yml`

触发方式：

1. `workflow_dispatch` 手动触发
   - `build_variant=debug`：内部测试
   - `build_variant=release`：发布候选
2. `push tag v*` 自动触发 release 构建

> 详细步骤见：`doc/github-actions-android-apk.md`

## ✅ 当前项目基线

- 本仓库以 **Android-only 交付路径**为准
- APK 打包不依赖 Docker/NAS 部署链路
- 云端能力仅作为可选增强，不是安装与基础使用前提
