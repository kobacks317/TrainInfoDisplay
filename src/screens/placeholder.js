// 画面プレースホルダーの共通レンダラー
// 各画面の詳細実装ができるまでの間、画面ID・名称・遷移リンクを表示する。

/**
 * プレースホルダー画面を描画する。
 *
 * @param {HTMLElement} container 描画先の要素
 * @param {{ id: string, name: string, links?: Array<{ path: string, label: string }> }} screen
 */
export function renderPlaceholderScreen(container, screen) {
  const section = document.createElement('section');
  section.className = 'screen-placeholder';
  section.dataset.screenId = screen.id;

  const heading = document.createElement('h1');
  heading.textContent = `${screen.id} ${screen.name}`;
  section.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'screen-placeholder__note';
  note.textContent = '（この画面は未実装のプレースホルダーです）';
  section.appendChild(note);

  if (screen.links && screen.links.length > 0) {
    const nav = document.createElement('nav');
    nav.className = 'screen-placeholder__links';
    nav.setAttribute('aria-label', '画面遷移');

    const list = document.createElement('ul');
    for (const link of screen.links) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${link.path}`;
      a.textContent = link.label;
      li.appendChild(a);
      list.appendChild(li);
    }
    nav.appendChild(list);
    section.appendChild(nav);
  }

  container.appendChild(section);
}
