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
  fs.writeFileSync(filename,source);
}
