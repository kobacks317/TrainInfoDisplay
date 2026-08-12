import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createUnsavedChangesGuard,
  hasUnsavedChanges,
  markClean,
  markDirty,
} from './unsaved-changes.js';

function makeEvent() {
  return { preventDefault: vi.fn() };
}

describe('markDirty / markClean / hasUnsavedChanges', () => {
  afterEach(() => {
    markClean();
  });

  it('既定は未保存の変更なし', () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('markDirtyで未保存ありになる', () => {
    markDirty();
    expect(hasUnsavedChanges()).toBe(true);
  });

  it('markCleanで未保存なしに戻る', () => {
    markDirty();
    markClean();
    expect(hasUnsavedChanges()).toBe(false);
  });
});

describe('createUnsavedChangesGuard', () => {
  afterEach(() => {
    markClean();
  });

  it('未保存の変更が無い場合は確認せず遷移を許可する', () => {
    const confirmFn = vi.fn(() => false);
    const guard = createUnsavedChangesGuard(confirmFn);
    const event = makeEvent();

    guard(event);

    expect(confirmFn).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('未保存の変更があり確認でOKした場合は遷移を許可する', () => {
    markDirty();
    const confirmFn = vi.fn(() => true);
    const guard = createUnsavedChangesGuard(confirmFn);
    const event = makeEvent();

    guard(event);

    expect(confirmFn).toHaveBeenCalledOnce();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('未保存の変更があり確認でキャンセルした場合は遷移を中止する', () => {
    markDirty();
    const confirmFn = vi.fn(() => false);
    const guard = createUnsavedChangesGuard(confirmFn);
    const event = makeEvent();

    guard(event);

    expect(confirmFn).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
});
