# Wrong-Notebook 迁移 Android（Capacitor）完整方案

## 1. 目标与范围

将 `https://github.com/wttwins/wrong-notebook` 迁移为可安装的 Android 应用，采用 **Capacitor** 作为原生容器，优先复用现有 Web 业务能力，保证快速上线与可持续迭代。

---

## 2. 项目现状与关键判断（基于仓库证据）

## 2.1 技术栈与运行特征

- Next.js 16（App Router）+ React 19（`README.md`, `package.json`）
- NextAuth 鉴权（`src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts`）
- Prisma + SQLite（`src/lib/prisma.ts`, `prisma/schema.prisma`）
- 大量 API Route（`src/app/api/**/route.ts`）

## 2.2 结论

该项目属于 **运行时 Web 应用**，不是纯静态前端。

- 不能以“纯前端静态离线包”实现完整功能。
- Android 迁移应采用：**Capacitor 壳 + 远端 HTTPS 服务**。

---

## 3. 目标架构设计

```text
Android App (Capacitor)
   └─ WebView 加载远端 HTTPS 域名
        └─ Next.js Runtime (Auth/API)
             └─ Prisma + Database + AI Providers
```

### 3.1 架构选型理由

1. 最小改造：保留 NextAuth/Prisma/API 现有实现。
2. 风险可控：避免在 Android 端硬搬 Node 运行时。
3. 上线最快：优先交付可用 Android 包，再逐步增强原生体验。

---

## 4. 功能说明（Android 版本）

## 4.1 MVP（首发）

- 本地入口（默认单机模式）+ 可选本地解锁（PIN/生物识别）
- 错题本与错题管理（列表、详情、增删改）
- 筛选（标签、掌握状态、时间范围等）
- AI 分析触发与结果展示
- 基础设置（含 AI 配置页面能力）

## 4.2 Beta（次阶段）

- 原生拍照上传增强（Camera/File）
- 导出/分享优化（服务端 PDF + 原生分享）
- 网络状态提示与失败重试
- Android 返回键导航优化

## 4.3 暂不纳入首发

- 全量离线数据库同步
- 推送通知体系
- 全原生 UI 重写（Compose）

---

## 5. 实施步骤（可执行）

## 5.1 阶段 A：后端可用性与域名

1. 初始化本地数据库与本地文件系统目录。
2. 完成本地入口与可选本地解锁流程。
3. 验证离线核心链路：错题 CRUD、复习、统计。

## 5.2 阶段 B：Capacitor 接入

安装依赖：

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

初始化与生成 Android 工程：

```bash
npx cap init
npx cap add android
```

新增 `capacitor.config.ts`（示例）：

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.wttwins.wrongnotebook',
  appName: 'Wrong Notebook',
  webDir: 'out',
  server: {
    url: 'https://your-domain.example.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
```

同步并打开 Android 工程：

```bash
npx cap sync android
npx cap open android
```

## 5.3 阶段 C：移动端专项改造

### a) 鉴权与会话稳定性

- 本地离线版不依赖服务端鉴权。
- 核心点：本地解锁状态、应用重启恢复、清除本地数据后的入口策略。

### b) 图片上传与拍照

- 关注文件：`src/components/upload-zone.tsx`
- 现状：主要为 Web 上传/截图路径；Android 需 Camera/File 插件兜底。

### c) 导出与打印

- 关注文件：`src/app/print-preview/page.tsx`
- 现状：`window.print()`；建议升级为“服务端生成 PDF + 原生分享”。

### d) 导航与返回键

- 确保硬件返回键优先 WebView 内回退，再退出 App。

## 5.4 阶段 D：测试与发布

- Emulator + 真机回归
- 内测包分发
- Crash/日志监控
- 通过验收后发布

---

## 6. 风险矩阵与缓解策略

| 风险 | 级别 | 触发点 | 缓解策略 |
|---|---|---|---|
| WebView 会话丢失 | 高 | Cookie/域名策略不一致 | 强制 HTTPS、固定主域、会话回归测试 |
| 图片能力不稳定 | 高 | Web 上传在 Android 差异 | Camera/File 插件兜底 + 错误重试 |
| 打印/PDF 体验不一致 | 高 | `window.print()` 在移动端差异 | 服务端 PDF 输出 + 原生分享 |
| 网络波动影响 AI | 中 | 请求超时/失败 | 超时、重试、可视化错误反馈 |
| 返回键行为混乱 | 中 | Web 导航与系统行为冲突 | 统一返回策略、关键页面专项测试 |

---

## 7. 里程碑计划

### M1（1-2 天）
- Capacitor 初始化完成
- Android 工程生成成功
- App 打开远端域名并可登录

### M2（2-4 天）
- 完成上传/拍照与基础体验优化
- 关键流程稳定

### M3（3-5 天）
- 导出分享增强
- 内测与修复
- 发布候选版本

---

## 8. 验收清单（上线门禁）

- [ ] Android APK 可安装并启动
- [ ] 登录/登出/会话保持正常
- [ ] 错题 CRUD 全链路可用
- [ ] AI 分析结果可返回并展示
- [ ] 图片上传/拍照链路可用
- [ ] 导出/分享可用
- [ ] 网络异常有明确提示与恢复路径
- [ ] 返回键行为符合 Android 预期

---

## 9. 建议的下一步执行命令（按顺序）

```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
npx cap add android
npx cap sync android
npx cap open android
```

> 注：本仓库当前未完成 Android 工程初始化，需按上方步骤创建。
