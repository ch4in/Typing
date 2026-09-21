'use strict';

const MAX_LINES = 2000;
const MAX_CHARS = 400 * 1024;

/**
 * 极简 LCS 行级 diff。
 * 返回 { tooLarge, rows: [{ type:'ctx'|'add'|'del', text, oldLine, newLine }], added, removed }
 */
function diffLines(oldText, newText) {
  const a = String(oldText == null ? '' : oldText).split('\n');
  const b = String(newText == null ? '' : newText).split('\n');

  if (a.length > MAX_LINES || b.length > MAX_LINES || b.join('').length > MAX_CHARS) {
    return { tooLarge: true, rows: [], added: 0, removed: 0 };
  }

  const n = a.length;
  const m = b.length;
  const dp = new Uint32Array((n + 1) * (m + 1));
  const idx = (i, j) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[idx(i, j)] = a[i] === b[j]
        ? dp[idx(i + 1, j + 1)] + 1
        : Math.max(dp[idx(i + 1, j)], dp[idx(i, j + 1)]);
    }
  }

  const rows = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: 'ctx', text: a[i], oldLine: i + 1, newLine: j + 1 });
      i++;
      j++;
    } else if (dp[idx(i + 1, j)] >= dp[idx(i, j + 1)]) {
      rows.push({ type: 'del', text: a[i], oldLine: i + 1, newLine: null });
      i++;
    } else {
      rows.push({ type: 'add', text: b[j], oldLine: null, newLine: j + 1 });
      j++;
    }
  }
  while (i < n) {
    rows.push({ type: 'del', text: a[i], oldLine: i + 1, newLine: null });
    i++;
  }
  while (j < m) {
    rows.push({ type: 'add', text: b[j], oldLine: null, newLine: j + 1 });
    j++;
  }

  const added = rows.filter((r) => r.type === 'add').length;
  const removed = rows.filter((r) => r.type === 'del').length;
  return { tooLarge: false, rows, added, removed };
}

module.exports = { diffLines };
