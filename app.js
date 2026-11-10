(() => {
  'use strict';
  const {sets: sources, figures} = quizData;
  const all = {id:'all', label:'All questions', questions:sources.flatMap(s=>s.questions.map(q=>({...q,source:s.label})))};
  const sets = [all,...sources];
  const $ = id => document.getElementById(id);
  const key = 'bda-endterm-practice-v1';
  let st = {set: sets[0].id, positions: {}, history: {}};
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && sets.some(x => x.id === saved.set) && saved.positions && saved.history) st = saved;
  } catch {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch {} };
  const setNow = () => sets.find(x => x.id === st.set);
  const indexNow = () => Math.min(Math.max(0, st.positions[st.set] || 0), setNow().questions.length - 1);
  const current = () => setNow().questions[indexNow()];
  const hist = q => st.history[q.id] || { count:0, solved:false, last:null, draft:null };
  const status = q => hist(q).solved ? 'ok' : hist(q).count ? 'bad' : '';
  const node = (tag, content, className) => {
    const e = document.createElement(tag);
    if (content != null) e.textContent = content;
    if (className) e.className = className;
    return e;
  };
  function go(i) {
    st.positions[st.set] = i;
    save(); render();
    $('question').focus({preventScroll:true});
    if ($('question').getBoundingClientRect().top < 0 || $('question').getBoundingClientRect().top > innerHeight / 2) {
      $('question').scrollIntoView({block:'start'});
    }
  }
  function renderSets() {
    $('sets').replaceChildren(...sets.map(s => {
      const button = node('button',null,'set');
      button.type = 'button';
      button.setAttribute('aria-current', String(s.id === st.set));
      button.append(node('span',s.label), node('b',s.questions.length));
      button.onclick = () => { if (st.set !== s.id) { st.set = s.id; go(indexNow()); } };
      return button;
    }));
  }
  function renderProgress() {
    const s = setNow();
    const completed = s.questions.filter(q => hist(q).solved);
    const retry = s.questions.filter(q => status(q) === 'bad');
    const percent = Math.round(100 * completed.length / s.questions.length);
    $('bar').value = percent;
    $('percent').textContent = `${percent}%`;
    $('solved').textContent = completed.length;
    $('first').textContent = completed.filter(q => hist(q).count === 1).length;
    $('retry').textContent = retry.length;
    $('map-note').hidden = s.id === 'all' || s.questions.every((q,i) => q.n === i + 1);
    $('review').hidden = !retry.length;
    $('review').onclick = () => {
      const next = s.questions.findIndex((q,i) => i > indexNow() && status(q) === 'bad');
      go(next < 0 ? s.questions.findIndex(q => status(q) === 'bad') : next);
    };
    $('grid').replaceChildren(...s.questions.map((q,i) => {
      const flag = status(q);
      const num = s.id === 'all' ? i+1 : q.n;
      const button = node('button',num,`jump ${flag}`.trim());
      button.type = 'button';
      button.setAttribute('aria-label',`Question ${num}: ${flag === 'ok' ? 'solved' : flag === 'bad' ? 'to retry' : 'new'}`);
      button.setAttribute('aria-current',String(i === indexNow()));
      button.onclick = () => go(i);
      return button;
    }));
  }
  function renderContext(q) {
    const area = $('context');
    area.replaceChildren();
    if (q.detail) area.append(node('p',q.detail,'context-line'));
    if (q.figure) {
      const fig = node('figure',null,'figure');
      const button = node('button'); button.type='button';
      const img = node('img'); img.src = figures[q.figure]; img.alt = q.alt;
      button.append(img, node('span','Enlarge figure ↗'));
      button.onclick = () => {
        $('zoomed').src = img.src; $('zoomed').alt = img.alt; $('figure-dialog').showModal();
      };
      fig.append(button); area.append(fig);
    }
    if (q.table) {
      const wrap = node('div',null,'tablewrap'), table = node('table'), head = node('thead'), body = node('tbody');
      const top = node('tr');
      for (const cell of q.table[0]) { const th = node('th',cell); th.scope='col'; top.append(th); }
      head.append(top);
      for (const row of q.table.slice(1)) {
        const tr = node('tr');
        for (const cell of row) tr.append(node('td',cell));
        body.append(tr);
      }
      table.append(head,body); wrap.append(table); area.append(wrap);
    }
    if (q.note) area.append(node('p',q.note,'note'));
  }
  function renderOptions(q) {
    const h = hist(q);
    $('answers').replaceChildren(...q.choices.map((option,i) => {
      const label = node('label',null,'choice');
      const input = node('input'); input.type='radio'; input.name='answer'; input.value=String(i);
      input.checked = h.draft === i || (h.solved && h.last === i);
      input.disabled = h.solved;
      const badge = node('span',String.fromCharCode(65+i),'letter'); badge.setAttribute('aria-hidden','true');
      label.append(input, badge, node('span',option,'text'));
      if (h.solved) label.classList.add('solved');
      if (h.last === i) {
        label.classList.add(h.solved ? 'right' : 'wrong');
        label.append(node('span', h.solved ? '✓ Correct' : '× Last try', 'verdict'));
      }
      input.onchange = () => { st.history[q.id] = {...hist(q), draft:i}; save(); renderAction(q); };
      return label;
    }));
    renderAction(q);
  }
  function renderAction(q) {
    const h = hist(q);
    $('attempts').textContent = h.count ? `${h.count} ${h.count===1?'attempt':'attempts'} · unlimited retries` : 'Unlimited attempts';
    $('check').textContent = h.solved ? 'Solved ✓' : h.count ? 'Check new answer' : 'Check answer';
    $('check').disabled = h.solved || h.draft == null;
  }
  function renderFeedback(q) {
    const h = hist(q);
    const box = $('feedback');
    box.replaceChildren();
    if (!h.count) return;
    const message = node('div',null,`message${h.solved?' good':''}`);
    message.append(node('strong',h.solved ? 'Correct' : 'Not quite. Here’s how to solve it.'),node('p',q.why));
    if (!h.solved) message.append(node('p','Choose an option above and check again.','retry-line'));
    box.append(message);
  }
  function render() {
    const s = setNow(), i = indexNow(), q = current();
    renderSets(); renderProgress();
    $('position').textContent = s.id === 'all' ? `Question ${i+1} of ${all.questions.length}` : `${s.label} / Question ${q.n}`;
    $('source').hidden = s.id !== 'all';
    $('source').textContent = s.id === 'all' ? `${q.source} · Q${q.n}` : '';
    $('progress-title').textContent = s.id === 'all' ? 'Overall progress' : 'This set';
    $('topic').textContent = q.topic;
    $('question').textContent = q.stem;
    renderContext(q); renderOptions(q); renderFeedback(q);
    $('prev').disabled = i === 0;
    $('next').textContent = i === s.questions.length - 1 ? 'Back to first ↺' : 'Next question →';
  }
  $('prev').onclick = () => go(indexNow()-1);
  $('next').onclick = () => go((indexNow()+1) % setNow().questions.length);
  $('form').onsubmit = e => {
    e.preventDefault();
    const q = current(), h = hist(q);
    if (h.solved || h.draft == null) return;
    const solved = Array.isArray(q.correct) ? q.correct.includes(h.draft) : h.draft === q.correct;
    st.history[q.id] = {count:h.count + 1, solved, last:h.draft, draft:null};
    save(); renderOptions(q); renderFeedback(q); renderProgress();
    if (solved) {
      $('next').focus({preventScroll:true});
    } else {
      const selected = $('answers').querySelector('.wrong input');
      selected?.focus({preventScroll:true});
    }
  };
  $('reset').onclick = () => {
    const everything = st.set === 'all';
    $('reset-title').textContent = everything ? 'Reset all progress?' : 'Reset this set?';
    $('reset-copy').textContent = everything ? `This clears your answers and attempts for all ${all.questions.length} questions.` : 'This clears your answers and attempts for this set.';
    $('reset-confirm').textContent = everything ? 'Reset all progress' : 'Reset this set';
    $('reset-dialog').returnValue=''; $('reset-dialog').showModal();
  };
  $('reset-dialog').addEventListener('close', () => {
    if ($('reset-dialog').returnValue !== 'reset') return;
    for (const q of setNow().questions) delete st.history[q.id];
    go(0);
  });
  $('source-total').textContent = `${all.questions.length} questions from the practice samples.`;
  render();
})();
