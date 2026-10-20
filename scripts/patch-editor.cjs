// TOAST UI 3.2.2 leaves a throttled toolbar resize callback pending on destroy.
// Skip its DOM update after teardown; removing this requires the desktop resize /
// document-switch regression to pass with the upgraded editor.
// Its global ToastMark node index also retains destroyed documents. Remove only
// this editor's tree, preserving any other live editor's node lookups.
const fs=require('node:fs');
const path=require('node:path');
const entry=require.resolve('@toast-ui/editor');
const dist=path.dirname(entry);
const needle='            _this.setState({ items: _this.initialItems, dropdownItems: [] });';
const guard='            if (!_this.refs.el.isConnected) return; // Markdeck: ignore resize after teardown\n';
const destroyNeedle='        this.wwEditor.destroy();\n        this.mdEditor.destroy();';
const cleanup=`        // Markdeck: release this document from the global ToastMark index.
        var pendingNodes = [this.toastMark.getRootNode()];
        while (pendingNodes.length) {
            var retiredNode = pendingNodes.pop();
            for (var child = retiredNode.firstChild; child; child = child.next) pendingNodes.push(child);
            if (getNodeById(retiredNode.id) === retiredNode) removeNodeById(retiredNode.id);
        }
`;
for(const file of ['toastui-editor.js','esm/index.js']){
  const filename=path.join(dist,file);let source=fs.readFileSync(filename,'utf8');
  for(const [target,insertion] of [[needle,guard],[destroyNeedle,cleanup]]){
    if(source.includes(insertion+target))continue;
    if(source.split(target).length!==2)throw new Error(`Review editor lifecycle patch after editor upgrade: ${file}`);
    source=source.replace(target,insertion+target);
  }
  // Keep this control inside the node view but outside contentDOM: it must
  // never enter Markdown, undo history or the copied text.
  const oldClick=`            var target = ev.target;
            var style = getComputedStyle(target, ':after');
            // judge to click pseudo element with background image for IE11
            if (style.backgroundImage !== 'none' && isFunction_default()(_this.getPos)) {
                var _a = _this.view.coordsAtPos(_this.getPos()), top = _a.top, right = _a.right;
                _this.createLanguageEditor({ top: top, right: right });
            }`;
  const copyClick=`            // Markdeck: copy the current model text, preserving whitespace.
            var button = ev.target.closest('.markdeck-code-copy');
            if (!button) return;
            ev.preventDefault();
            ev.stopPropagation();
            if (button.disabled) return;
            button.disabled = true;
            (window.desktop && window.desktop.copyText ? window.desktop.copyText(_this.node.textContent) : navigator.clipboard.writeText(_this.node.textContent)).then(function () {
                if (!button.isConnected) return;
                button.setAttribute('data-copied', 'true');
                button.setAttribute('aria-label', '已复制');
                button.title = '已复制';
                _this.clearTimer();
                _this.timer = setTimeout(function () {
                    button.removeAttribute('data-copied');
                    button.setAttribute('aria-label', '复制块内文字');
                    button.title = '复制块内文字';
                }, 1600);
            }).catch(function () {
                button.title = '复制失败，请重试';
                button.setAttribute('aria-label', '复制失败，请重试');
            }).finally(function () { button.disabled = false; });`;
  const oldAppend=`        wrapper.appendChild(pre);
        this.dom = wrapper;`;
  const copyAppend=`        wrapper.appendChild(pre);
        // Markdeck: accessible copy control, outside editable code.
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'markdeck-code-copy';
        button.contentEditable = 'false';
        button.title = '复制块内文字';
        button.setAttribute('aria-label', '复制块内文字');
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="copy-symbol"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></g><path class="copied-symbol" d="m5 12 4 4L19 6"/></svg>';
        wrapper.appendChild(button);
        this.dom = wrapper;`;
  for (const [before,after] of [[file.startsWith('esm/') ? oldClick.replace('isFunction_default()','isFunction_1').replace('top = _a.top','top_1 = _a.top').replace('top: top,','top: top_1,') : oldClick,copyClick],[oldAppend,copyAppend]]) {
    if(source.includes(after))continue;
    if(source.split(before).length!==2)throw new Error('Review code copy patch after editor upgrade: '+file);
    source=source.replace(before,after);
  }
  const mutationTarget='    CodeBlockView.prototype.stopEvent = function () {';
  const mutationGuard=`    CodeBlockView.prototype.ignoreMutation = function (mutation) {
        // Markdeck: copy feedback is UI, not an edit to the document.
        return mutation.type !== 'selection' && !!mutation.target.closest &&
            !!mutation.target.closest('.markdeck-code-copy');
    };
`;
  if(!source.includes(mutationGuard+mutationTarget)){
    if(source.split(mutationTarget).length!==2)throw new Error('Review code copy mutation patch: '+file);
    source=source.replace(mutationTarget,mutationGuard+mutationTarget);
  }
  fs.writeFileSync(filename,source);
}
