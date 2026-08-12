// 未保存の変更がある状態での画面遷移時に確認ダイアログを出すためのフック
// 参照: docs/02_screen_design.md §4.1「未保存の変更がある状態で画面遷移する場合、確認ダイアログを表示する」

let dirty = false;

/** 未保存の変更ありとしてマークする（編集画面の入力時などに呼び出す）。 */
export function markDirty() {
  dirty = true;
}

/** 未保存の変更なしとしてマークする（保存・キャンセル後などに呼び出す）。 */
export function markClean() {
  dirty = false;
}

/** 未保存の変更があるかどうかを取得する。 */
export function hasUnsavedChanges() {
  return dirty;
}

/**
 * ルーターの `beforenavigate` イベントに登録する確認ハンドラを生成する。
 * 未保存の変更がある場合のみ確認ダイアログを表示し、キャンセルされたら
 * `event.preventDefault()` を呼んで画面遷移を中止する。
 *
 * @param {(message: string) => boolean} confirmFn 確認ダイアログの実装（テスト等で差し替え可能）
 */
export function createUnsavedChangesGuard(confirmFn = (message) => window.confirm(message)) {
  return function unsavedChangesGuard(event) {
    if (!dirty) return;
    const proceed = confirmFn('保存されていない変更があります。このまま画面を移動しますか？');
    if (!proceed) {
      event.preventDefault();
    }
  };
}
