# Wrong Notebook Android Migration Plan (Capacitor)

## 1. Goal

Migrate `wttwins/wrong-notebook` to an Android app using **Capacitor** while keeping existing web UI and business logic as much as possible.

## 2. Current System Assessment

Based on repository structure and dependencies:

- Frontend framework: **Next.js 16 + React 19**
- Backend/runtime dependencies: **NextAuth**, **Prisma**, server routes, AI provider calls
- Data layer: SQLite via Prisma (server-side)

### Key Conclusion

Current target branch is **Android offline-first**:

- APK build and installation are local and do not require cloud deployment.
- Local sqlite + offline runtime path is the baseline.
- Optional cloud AI calls can be layered on top when network is available.

## 3. Target Architecture

```text
Android App (Capacitor WebView)
    └── Loads local app UI and offline runtime
            └── Local sqlite + offline queue/services
                    └── Optional online provider integration when available
```

### Recommended phases

1. **Phase A (MVP)**: Android local runtime + sqlite baseline.
2. **Phase B**: Mobile UX and native integrations (camera/share/file/image pick).
3. **Phase C**: Optional cloud-enhanced AI path and sync.

## 4. Capacitor Integration Plan

## 4.1 Dependencies

- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/android`

Optional plugins (as needed):

- `@capacitor/camera`
- `@capacitor/filesystem`
- `@capacitor/share`
- `@capacitor/network`

## 4.2 Project Configuration

Create `capacitor.config.ts`:

- `appId`: `com.wttwins.wrongnotebook`
- `appName`: `Wrong Notebook`
- `webDir`: directory containing frontend build output
- `android.allowMixedContent`: false (default secure mode)

Example (MVP remote-url mode):

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
}

export default config
```

## 4.3 Scripts

Add scripts in `package.json`:

- `cap:init`: `npx cap init`
- `cap:add:android`: `npx cap add android`
- `cap:sync`: `npx cap sync android`
- `cap:open`: `npx cap open android`

If local bundled assets are used later:

- `build:web`: existing `next build` + export/static flow that outputs to `webDir`
- `android:sync`: `npm run build:web && npx cap sync android`

## 4.4 Android Native Layer

- Package name: `com.wttwins.wrongnotebook`
- Min SDK: align with Capacitor default (usually 22+)
- Target SDK: latest stable supported by Android Studio + Capacitor
- App icon/splash: provide branded assets

## 5. Product Capability Mapping

| Existing capability | Android status (Capacitor) | Notes |
|---|---|---|
| 登录/鉴权 (NextAuth) | ✅ | Keep backend cookies/session over HTTPS |
| 错题本管理/筛选 | ✅ | Pure web feature inside WebView |
| AI 分析 | ✅ | Continues via backend API |
| 图片上传/裁剪 | ✅* | Validate file input and camera plugin integration |
| 打印/PDF导出 | ⚠️ | WebView print behavior differs; may require native share/export flow |
| 管理员后台 | ✅ | Works as mobile web page |

## 6. Security & Compliance

- Keep local data encrypted/protected according to Android best practices
- Restrict external network access to explicit optional integrations only
- Add Android network security config only if strictly needed for optional cloud features

## 7. Risks and Mitigations

1. **Runtime coupling risk**
   - Mitigation: keep offline core path independent from optional network services
2. **WebView compatibility issues for file upload/camera**
   - Mitigation: implement Capacitor Camera/File plugins fallback
3. **Session persistence differences on Android WebView**
   - Mitigation: test login lifecycle, cookie policies, app cold start
4. **Print/export inconsistency**
   - Mitigation: switch to server-generated PDF download + native share

## 8. Delivery Milestones

### Milestone 1 (1-2 days)
- Capacitor initialized
- Android project generated
- App opens deployed web domain
- Basic login and core pages verified on emulator

### Milestone 2 (2-4 days)
- Mobile UX adjustments (viewport, touch targets)
- Image upload/camera flow stabilization
- Error/retry and network state prompts

### Milestone 3 (3-5 days)
- Export/share enhancements
- Beta test + crash monitoring
- Release candidate build

## 9. Verification Checklist

- [ ] `npm install` successful
- [ ] `npx cap add android` successful
- [ ] `npx cap sync android` successful
- [ ] Android Studio build successful (debug)
- [ ] Local entry/unlock and offline flows work
- [ ] Wrong notebook CRUD works
- [ ] Image upload/crop works
- [ ] AI analysis end-to-end works
- [ ] HTTPS and cookie behavior verified
