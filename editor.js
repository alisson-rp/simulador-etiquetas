(function (root) {
  root.StudioEditor = {
    attach(editor, numbers) {
      const $ = (id) => ({ code: editor, numbers })[id];
      $('code').wrap = 'soft';
      const lineMeasure = document.createElement('div');
      lineMeasure.className = 'line-measure';
      document.body.append(lineMeasure);
      function refresh() {
        const editor = $('code'),
          style = getComputedStyle(editor);
        lineMeasure.style.font = style.font;
        lineMeasure.style.lineHeight = style.lineHeight;
        lineMeasure.style.width =
          Math.max(
            1,
            editor.clientWidth -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight),
          ) + 'px';
        const fragment = document.createDocumentFragment();
        editor.value.split('\n').forEach((line, i) => {
          lineMeasure.textContent = line || ' ';
          const row = document.createElement('div');
          row.textContent = i + 1;
          row.style.height =
            Math.max(23, lineMeasure.getBoundingClientRect().height) + 'px';
          fragment.append(row);
        });
        $('numbers').replaceChildren(fragment);
        $('numbers').scrollTop = editor.scrollTop;
      }
      new ResizeObserver(refresh).observe($('code'));

      return { refresh };
    },
  };
})(window);
