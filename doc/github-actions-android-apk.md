# GitHub 打包 Android APK（Capacitor）

本文档说明如何通过 GitHub Actions 自动构建 wrong-notebook 的 Android APK（debug/release）。

## 1. 前置条件

在启用工作流前，请先在本地完成并提交 Android 工程：

1. 安装 Capacitor 依赖
2. 执行 `npx cap add android`
3. 将 `android/` 目录提交到仓库

如果仓库没有 `android/gradlew`，工作流会直接失败并给出提示。

## 2. 工作流文件

- `.github/workflows/android-apk.yml`

触发方式：

- 手动触发（`workflow_dispatch`）
  - 可选 `build_variant`: `debug` / `release`
  - 可选 `attach_to_release`: 是否上传到最新 Release
- 推送版本标签（`push tags: v*`）
  - 自动构建 `release`
  - 自动上传 APK 到对应 GitHub Release

## 3. 必需 Secrets（仅 release 签名时）

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中配置：

- `ANDROID_KEYSTORE_BASE64`：keystore 文件的 base64 内容
- `ANDROID_KEY_ALIAS`：签名 alias
- `ANDROID_KEYSTORE_PASSWORD`：keystore 密码
- `ANDROID_KEY_PASSWORD`：key 密码

如果 release 构建时未提供 `ANDROID_KEYSTORE_BASE64`，工作流会输出未签名/默认 release APK（按项目当前 Gradle 配置结果）。

## 4. 生成 keystore 与 base64 示例

### 4.1 生成 keystore

```bash
keytool -genkeypair -v -keystore wrongbook-release.jks -alias wrongbook -keyalg RSA -keysize 2048 -validity 10000
```

### 4.2 转 base64（macOS/Linux）

```bash
base64 -i wrongbook-release.jks | pbcopy
```

把剪贴板内容填到 `ANDROID_KEYSTORE_BASE64`。

## 5. 产物位置与命名

工作流会上传 Artifact：

- `android-apk-debug`
- `android-apk-release`

若 release 启用了签名，优先产物为：

- `android/app/build/outputs/apk/release/app-release-signed.apk`

## 6. 推荐发布流程

1. 本地验证改动并推送到 GitHub
2. 打 tag：`v1.0.0`
3. Push tag 触发工作流
4. 在 GitHub Release 页面下载已挂载 APK

## 7. 常见问题

### Q1: 工作流报错 Missing android project

说明仓库尚未提交 `android/` 工程，请本地执行 `npx cap add android` 后提交。

### Q2: Release 构建成功但没有签名

检查 4 个签名 Secrets 是否完整，尤其是 `ANDROID_KEYSTORE_BASE64`。

### Q3: 想仅内部测试，不走签名

手动触发 workflow 并选择 `debug` 即可，下载 `android-apk-debug` artifact。
