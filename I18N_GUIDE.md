# 国际化（i18n）迁移指南

生成日期：2026-10-17。本文件配合 `OPTIMIZATION_PLAN.md` 阶段 3.3，记录如何把目前写死在 JS 里的中文字符串逐步抽到 `locales/` 词典。

## 骨架结构

- `src/i18n.js`：运行时翻译函数。
  - `t(key, params?)`：返回当前语言的译文；缺 key 回退到 `zh-CN`；再缺就返回 key 本身。支持 `{name}` 占位符。
  - `getLocale()` / `setLocale(code)`：切换语言，广播 `markdeck-locale` 事件；写入 `localStorage['markdeck.locale']`。
  - `toastUiLocale()`：返回小写短横形式（如 `zh-cn`），用于 TOAST UI Editor 的 `language` 配置。
- `locales/zh-CN.json`：默认词典（权威源）。
- `locales/en-US.json`：英文词典。
- 语言检测顺序：`localStorage` → `navigator.language` → `navigator.language` 主语种匹配 → 回退 `zh-CN`。

## 两条迁移路线

### 快速路线：先替换"用户可见、高频"字符串

优先级：**顶部按钮 label → toast / alert → dialog 标题 → 其他**。

当前已覆盖的 key 清单：顶部动作（save/open/new/saveAs/reload/export/find/settings）、三模式名、常见 toast、默认标题 "无标题文档"、搜索 placeholder。

### 完整路线：静态扫描 + 逐文件替换

逐个文件：

1. 顶部加 `import {t} from './i18n.js';`
2. 把中文字符串字面量替换成 `t('xxx.yyy')`，并在 `locales/zh-CN.json` + `locales/en-US.json` 都加 key。
3. 命名约定：
   - `action.<verb>`：动作/按钮
   - `toast.<name>`：toast 文案
   - `dialog.<name>.<field>`：弹窗标题/正文/按钮
   - `error.<code>`：错误消息（主进程抛出的也应加）
   - `menu.<path>`：原生菜单项
4. 带参数的用占位符：`t('toast.referenceFailed', {message: e.message})`。
5. HTML 模板里的中文：模板字面量生成 DOM 的位置改用 `t()`；真正的 `<title>` 等暂保留。

## 主进程（desktop/*.cjs）如何办？

主进程抛出的 `throw new Error('文档不存在')` 之类，走的是 IPC 返回给渲染端。两种做法：

1. **主进程继续用中文**，渲染端拦截 `error.message` 后根据正则/映射表翻译。短期可行。
2. **主进程改抛 code**：`throw new Error('ERR_DOC_NOT_FOUND')`，渲染端用 `t('error.ERR_DOC_NOT_FOUND')` 翻译。长期正确做法。

本次只搭骨架未改主进程，建议按（2）在下一次迁移窗口统一动。

## TOAST UI Editor 语言

目前 `src/main.js:16` 静态 `import '@toast-ui/editor/dist/i18n/zh-cn'`。
后续应改为按 `toastUiLocale()` 动态 `import()`，并在 Editor 构造时传 `language`。

TOAST UI 自带多语言文件在 `node_modules/@toast-ui/editor/dist/i18n/`（含 en 没有独立包，默认 fallback 到英文）。

## 设置界面入口（未做）

当前应用没有"切换语言"的 UI。阶段 3.3 完成需要在设置弹窗加一个下拉；代码接口已就绪，只缺 UI。

## 验证

- `node -e "import('./src/i18n.js').then(m=>{console.log(m.t('mode.write'));m.setLocale('en-US');console.log(m.t('mode.write'))})"` 应打印 "写作" / "Write"。
- 完整迁移完成后，`grep -nE "'[^']*[\u4e00-\u9fa5]+[^']*'" src/*.js` 应为空（CSS 注释除外）。

## 下一次迁移窗口建议

1. 把 `src/main.js` 剩余中文全部替换（最高频面板）。
2. `src/image-controls.js` / `src/logic-panel.js` / `src/show-plan.js` 三个大户。
3. 主进程错误 code 化。
4. 设置界面加语言下拉。
5. TOAST UI 动态语言加载。
