(() => {
  const stage = document.getElementById('experiences');
  const cards = [...stage.querySelectorAll('.role-card')];
  const overview = document.getElementById('overview');
  const instruction = document.getElementById('instruction');
  const announcer = document.getElementById('announcer');
  const tip = document.getElementById('role-tip');
  const labels = {user:'停车用户', officer:'巡查员', manager:'管理员'};
  const tips = {
    user:'可用车辆 DEMO004。点击停车点或搜索 Torino，开始一次模拟停车。',
    officer:'DEMO001：有效；DEMO002：过期；DEMO003：初始宽限期。先开始班次，再查询车牌。',
    manager:'选择城市与停车场，查看费率、车位和统计。管理端保留原桌面布局。'
  };
  let activeRole = null;
  let frame = null;
  let observer = null;

  function captureLayout() {return cards.map(card => card.getBoundingClientRect())}
  function animateLayout(before) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cards.forEach((card, index) => {
      const after = card.getBoundingClientRect();
      const from = before[index];
      card.animate([
        {transformOrigin:'top left',transform:`translate(${from.left-after.left}px,${from.top-after.top}px) scale(${from.width/after.width},${from.height/after.height})`},
        {transformOrigin:'top left',transform:'none'}
      ], {duration:480,easing:'cubic-bezier(.2,.75,.2,1)'});
    });
  }

  function openRole(role) {
    if (activeRole === role) return;
    const before = captureLayout();
    observer?.disconnect();
    stage.querySelector('.live-area')?.remove();
    activeRole = role;
    const selected = cards.find(card => card.dataset.role === role);
    const others = cards.filter(card => card !== selected);
    cards.forEach(card => {
      const active = card === selected;
      card.classList.toggle('active', active);
      card.querySelector('.card-select').setAttribute('aria-pressed', String(active));
      card.style.order = active ? '1' : String(others.indexOf(card) * 2);
    });
    stage.classList.add('focused');
    const live = document.createElement('div');
    live.className = 'live-area';
    const windowElement = document.createElement('div');
    windowElement.className = 'live-window' + (role === 'manager' ? ' manager-window' : '');
    frame = document.createElement('iframe');
    frame.id = 'app-frame';
    frame.title = `TPS 原始${labels[role]}端界面`;
    frame.src = `${role}/?v=pointer-v2`;
    frame.allow = 'clipboard-write';
    windowElement.append(frame);
    const caption = document.createElement('div');
    caption.className = 'live-caption';
    const hint = document.createElement('span');
    hint.textContent = '点击左右卡片切换视角';
    const standalone = document.createElement('a');
    standalone.href = frame.src;
    standalone.target = '_blank';
    standalone.rel = 'noopener';
    standalone.textContent = '单独打开 ↗';
    caption.append(hint, standalone);
    live.append(windowElement, caption);
    selected.append(live);
    // Render the original layouts at their native sizes; only scale the outer viewport.
    const nativeWidth = role === 'manager' ? 1150 : 413;
    const nativeHeight = role === 'manager' ? 760 : 740;
    function resize() {
      const available = Math.max(1, live.clientWidth - parseFloat(getComputedStyle(live).paddingLeft) - parseFloat(getComputedStyle(live).paddingRight));
      const border = parseFloat(getComputedStyle(windowElement).borderLeftWidth) * 2;
      const scale = Math.min(1, (available - border) / nativeWidth);
      frame.style.width = `${nativeWidth}px`;
      frame.style.height = `${nativeHeight}px`;
      frame.style.transform = `scale(${scale})`;
      windowElement.style.width = `${nativeWidth * scale + border}px`;
      windowElement.style.height = `${nativeHeight * scale + border}px`;
    }
    observer = new ResizeObserver(resize);
    observer.observe(live);
    resize();
    animateLayout(before);
    overview.hidden = false;
    instruction.textContent = `正在体验${labels[role]}端。点击两侧卡片可切换，也可以返回三端概览。`;
    tip.textContent = tips[role];
    announcer.textContent = `已展开${labels[role]}端`;
    overview.focus({preventScroll:true});
  }

  cards.forEach(card => card.querySelector('.card-select').addEventListener('click', () => openRole(card.dataset.role)));
  overview.addEventListener('click', () => {
    const before = captureLayout();
    const previous = cards.find(card => card.dataset.role === activeRole);
    observer?.disconnect();
    stage.querySelector('.live-area')?.remove();
    frame = null;
    activeRole = null;
    stage.classList.remove('focused');
    cards.forEach(card => {card.classList.remove('active');card.style.order = '';card.querySelector('.card-select').setAttribute('aria-pressed','false')});
    overview.hidden = true;
    instruction.textContent = '移动鼠标，看看不同角色。点击卡片，进入原版界面体验。';
    tip.textContent = '三端使用同一份本地演示数据，可随时切换视角。';
    announcer.textContent = '已返回三端概览';
    previous?.querySelector('.card-select').focus({preventScroll:true});
    animateLayout(before);
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('清除本浏览器中的 TPS 演示修改并恢复初始数据？')) return;
    if (frame) frame.contentWindow.postMessage('tps-reset', location.origin);
    else localStorage.removeItem('tps-original-flutter-v2');
    announcer.textContent = '演示数据已重置';
  });
})();
