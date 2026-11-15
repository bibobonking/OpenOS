# HOW-TO

Hướng dẫn tùy biến OpenOS **bằng source**. Đây là template, không phải sản phẩm.

OpenOS cố tình **không** có cơ chế tùy biến nào: không settings app, không file
config, không theme JSON, không plugin API, không registry DE. Không có gì để
đăng ký, không có gì tự khôi phục lại giá trị mặc định. Muốn khác → sửa source
và build lại, đúng kiểu bạn patch một desktop Linux.

Đổi lại: không giới hạn. Bất cứ thứ gì viết được bằng React đều nhét được vào
đây, và kernel không cản.

---

## 1. Chạy thử

```bash
bun install
bun run dev        # vite dev server, mở URL in ra
bun run desktop    # build rồi chạy trong Electron
bun run pack       # build + đóng gói cho nền tảng hiện tại
bun run typecheck  # tsc --noEmit
bun run test       # node --test
```

Sau khi sửa source, dev server tự reload. Sau khi sửa `electron/`, phải chạy
lại `bun run desktop`.

---

## 2. Bản đồ source

```
src/kernel/        kernel — không biết gì về giao diện
  types.ts           FileNode / DirNode / Process / KernelEventMap
  vfs.ts             filesystem thuần hàm: read/write/mkdir/rm/mv, lỗi có mã
  kernel.ts          process table, event bus, persist localStorage
  seed.ts            ảnh đĩa của lần boot đầu
  vfs.test.ts

src/os/            desktop — đây chính là DE
  Desktop.tsx        layout: Dock + window layer + Taskbar
  theme.ts           màu, radius, wallpaper (hằng số, không ai đọc từ file)
  Window.tsx         chrome cửa sổ: kéo, resize, z-order, minimize, close
  appFrame.ts        loader .html + cầu `openos`
  AppFrame.tsx       phía host của cầu
  hooks.ts           React binding cho kernel
  appFrame.test.ts

src/apps/          app native viết bằng React
  Files.tsx          duyệt / sửa / xoá VFS
  Editor.tsx         text editor trên VFS
  registry.ts        danh sách mà Dock tình cờ map qua
```

**Một luật duy nhất:** desktop import kernel, kernel **không bao giờ** import
desktop. Phá luật này là tạo circular import và React sẽ vỡ.

---

## 3. Công thức: muốn X → sửa Y

### Đổi màu, font, bo góc, wallpaper

`src/os/theme.ts`. Đây chỉ là một object hằng, không phải config:

```ts
export const theme = {
  bg: '#0b0d12',
  accent: '#6aa9ff',
  radius: 12,
  wallpaper: 'url(https://example.com/a.jpg) center/cover',
  // ...
}
```

`Desktop.tsx` và `Window.tsx` cùng import object này. Muốn bỏ luôn cũng được —
hard-code thẳng vào style cũng chạy.

### Đổi dock

`src/os/Desktop.tsx`, hàm `Dock`. Nó chỉ là một `<nav>` map qua `apps`.
Đổi `flexDirection`, đổi cạnh, đổi kích thước, thêm nhóm, thêm chữ — tùy bạn.

Muốn dock nằm dưới màn hình? Trong `Desktop`, đổi thứ tự trong `<div flex>`
và bỏ `borderRight`, thêm `borderTop`.

### Đổi layout hoàn toàn (top bar, tiling, không cửa sổ)

Viết lại `Desktop`. Kernel chỉ giữ `pid` + geometry; nó không quan tâm bạn vẽ
chúng thế nào. Ví dụ tiling đơn giản:

```tsx
function Desktop() {
  const processes = useProcesses()
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {processes.map((p) => (
        <div key={p.pid} style={{ flex: 1, borderRight: '1px solid #333', overflow: 'hidden' }}>
          <AppContent proc={p} />   {/* bỏ <Window>, bỏ kéo thả */}
        </div>
      ))}
    </div>
  )
}
```

`Window` là component thường — xoá được, thay được, không viết lại cũng được.

### Thêm app native

Ba bước, không có bước đăng ký nào:

1. Viết component, ví dụ `src/apps/Clock.tsx`.
2. Import vào `Desktop.tsx` và thêm một `case` trong `AppContent`:
   ```tsx
   case 'clock':
     return <Clock />
   ```
3. Thêm vào `NATIVE` trong `src/apps/registry.ts` để nó có icon trên dock:
   ```ts
   { id: 'clock', title: 'Clock', icon: '◷' },
   ```

App native chạy trong cùng process React → **import trực tiếp `kernel`** và
gọi `kernel.read()`, `kernel.ls()`… không cần cầu `openos`.

### Đổi chrome cửa sổ

`src/os/Window.tsx`. Kéo thả bằng pointer events, resize bằng góc dưới phải,
`z-index` lấy từ `proc.z` do kernel cấp. Thêm nút, thêm snap, thêm tab — sửa
trực tiếp file này.

### Thêm một program `.html`

Hai cách:

- **Lúc chạy:** mở app Files → tạo `.html` trong `/apps`. Dock tự có icon (vì
  `registry.ts` quét `/apps` mỗi lần cây đổi).
- **Nhúng vào bản build:** thêm chuỗi vào `src/kernel/seed.ts`. Nhớ
  `kernel.reset()` (xem mục 5) — seed chỉ chạy khi máy chưa có ảnh đĩa.

### Đổi filesystem ban đầu

`src/kernel/seed.ts` — toàn bộ nội dung ổ đĩa của lần cài đầu, viết bằng
`writeFile(root, '/đường/dẫn', nội_dung)`.

### Thêm syscall / đổi kernel

`src/kernel/kernel.ts` là class, mỗi method là một syscall. Thêm cái bạn cần:

```ts
// trong class Kernel
async load(url: string): Promise<string> {
  const res = await fetch(url)
  const text = await res.text()
  this.write('/home/download.txt', text)
  return '/home/download.txt'
}
```

`src/kernel/vfs.ts` là ~200 dòng hàm thuần (không DOM, không React) → có thể
`node --test` trực tiếp, và có thể thay bằng backend khác (IndexedDB, OPFS,
HTTP server, đĩa thật qua Electron IPC) mà không đụng gì phía trên.

### Reset về ảnh đĩa gốc

Trong Console của devtools:

```js
kernel.reset()   // cần kernel trong scope; nếu không, xoá key dưới đây
localStorage.removeItem('openos.v1')  // rồi reload
```

---

## 4. Một chương trình là file `.html`

Mở `.html` trong Files → nó chạy trong `<iframe sandbox>` với origin **opaque**
(cách ly thật, không chạm được DOM của desktop).

Trước khi chạy, loader đọc file và:

- thay `<link href="/….css">` bằng `<style>` nội dung file đó,
- thay `<script src="/….js">` bằng `<script>` nội dung file đó,
- chèn cầu `openos` ngay sau `<head>`.

Nên một app là **ba file trong VFS**:

```
/apps/hello.html    cấu trúc
/apps/hello.css     trình bày
/apps/hello.js      hành vi
```

App có đúng một global, `openos`:

```js
const text = await openos.read('/home/notes.txt')        // -> string
await openos.write('/home/notes.txt', 'xin chào')        // -> true
const items = await openos.ls('/home')                   // -> [{ name, type, path }]
await openos.open('/apps/hello.html')                    // mở app khác
```

Thêm syscall mới cho app: sửa `BridgeOp` + `runBridge` trong `src/os/appFrame.ts`,
rồi thêm method tương ứng vào object `window.openos` trong hằng `BRIDGE` cùng file.

---

## 5. Lưu ý — đọc trước khi tin tưởng

Đây là template phác thảo, không phải OS hoàn chỉnh. Những chỗ hụt thật:

**Dữ liệu**

- FS nằm trong `localStorage` key `openos.v1`, ghi qua `JSON.stringify` sau
  200ms debounce. Vượt quota → `persist()` **nuốt lỗi im lặng**, dữ liệu chỉ
  còn trong RAM session đó và mất khi reload. File lớn (ảnh, video) sẽ chết ở đây.
- Cả cây FS được serialize lại **mỗi lần ghi một file**. VFS vài trăm file thì
  ổn; vài chục nghìn thì không.
- **Process table không được persist.** Reload là mất hết cửa sổ đang mở, kể
  cả geometry. Chỉ cây file sống sót.

**Cách ly app `.html`**

- `sandbox="allow-scripts allow-modals allow-forms allow-popups"`, **cố ý không
  có `allow-same-origin`** → origin opaque nên `localStorage`, cookie, IndexedDB
  trong app đều ném `SecurityError`. Muốn app nhớ dữ liệu → dùng `openos.write`.
- App không `fetch` được đường dẫn tương đối (không có base URL, `srcdoc`).
  `https://` tuyệt đối thì được, nhưng phụ thuộc CORS vì origin là `null`.
- Cầu kiểm tra `e.source === iframe.contentWindow`; không kiểm được `e.origin`
  vì opaque origin trả về `"null"`. Đừng nới lỏng `sandbox` để "cho tiện" —
  đó là toàn bộ ranh giới bảo mật của app.
- Thêm `allow-same-origin` = app chạm được DOM desktop và cả kernel. Đừng làm
  trừ khi bạn thật sự muốn điều đó.

**Chỉ nội tuyến đường dẫn tuyệt đối**

- Regex chỉ khớp `src="/…js"` và `href="/…css"` (bắt đầu bằng `/`). URL ngoài,
  `data:`, đường dẫn tương đối `./x.js` **không** được inline và sẽ 404.
- Nội dung `.js` được escape `</script` trước khi nhúng, nhưng nếu bạn nhúng
  chuỗi HTML thô từ file khác thì tự chịu trách nhiệm.

**React / TS**

- `Window.tsx` import `theme` từ `theme.ts`; `Desktop.tsx` cũng vậy. **Không**
  để `theme.ts` import `Desktop.tsx` — vòng lặp chết người.
- `useProcesses()` / `useFsVersion()` force re-render toàn desktop. Cây file lớn
  → sẽ giật. Chưa có memo theo path.
- `noUnusedLocals` / `noUnusedParameters` bật trong `tsconfig.json`; `verbatimModuleSyntax`
  cũng bật nên `import type` là bắt buộc cho type-only import.
- Import dùng đuôi `.ts` / `.tsx` (`allowImportingTsExtensions`). Giữ đúng như vậy.

**Electron**

- `electron/main.cjs` load `dist/index.html` → **phải build trước**, `electron .`
  một mình sẽ trắng trang.
- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, không có
  preload. Renderer **không** chạm được đĩa thật. Muốn mount đĩa thật → bạn phải
  tự thêm preload + IPC, việc đó phá ranh giới hiện tại.
- Link `https://` từ app được `setWindowOpenHandler` đẩy ra browser thật và
  `deny` trong cửa sổ OS.

**Build**

- `bun run test` chạy `node --test` trên file `.ts` (Node 22+ strip types). Trong
  Node không có `localStorage`, bạn sẽ thấy `ExperimentalWarning` — vô hại, vì
  `persist()`/`load()` đều đã bọc try/catch.
- CI (`.github/workflows/build.yml`) chạy typecheck + test + build trên Linux,
  Windows, macOS rồi đóng gói AppImage/deb, nsis, dmg/zip. Kích bằng tag `v*`
  hoặc chạy tay. `dist/` và `release/` không commit.
- Test hiện chỉ phủ VFS và app frame. Phần React **chưa có test nào** — sửa
  `Desktop.tsx` thì tự mở mắt mà nhìn.

---

## 6. Gợi ý mở rộng

Chưa có, và sẽ không tự có — nhưng chỗ để nhét đã sẵn:

| Muốn | Bắt đầu từ |
|---|---|
| Cửa sổ snap / tiling | `Window.tsx` + geometry trong `Process` |
| Workspace ảo | thêm field vào `Process`, lọc trong `Desktop.tsx` |
| Đọc/ghi đĩa thật | preload + IPC trong `electron/main.cjs`, backend mới cho `vfs.ts` |
| Đa người dùng / quyền | `Kernel`, thêm `uid` vào `Process` và kiểm tra trong syscall |
| Terminal | app native mới gọi thẳng `kernel.read/write/ls` |
| Animation chuyển cảnh | bọc `{windowLayer}` bằng thư viện bạn thích |

Không có API ổn định nào để giữ tương thích. Cứ sửa.
