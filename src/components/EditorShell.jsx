import { useState } from "react";
import SceneEditor from "./SceneEditor";
import TimelineEditor from "./TimelineEditor";

/**
 * EditorShell — entry point for ?editor=true.
 * Starts on the timeline editor; lets the user drill into per-event scene editor.
 * 当前故事线（dufu / dante / …）在这里管理，两个编辑器共用，保存时随请求下发。
 *
 * 单独成文件并由 App 在 DEV 下动态引入：SceneEditor 的素材自动发现
 * （import.meta.glob /public/assets/**）会把全部图片再打包一份进 dist，
 * 编辑器本来就只在本地 dev 中间件下可用，生产构建必须把它整体排除。
 */
export default function EditorShell() {
  const [editorLine, setEditorLine] = useState("dufu");
  const [editingEventId, setEditingEventId] = useState(null);
  if (editingEventId) {
    return (
      <SceneEditor
        initialEventId={editingEventId}
        initialLine={editorLine}
        onExit={() => setEditingEventId(null)}
      />
    );
  }
  return (
    <TimelineEditor
      line={editorLine}
      onLineChange={setEditorLine}
      onEditEvent={setEditingEventId}
    />
  );
}
