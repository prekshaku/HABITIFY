// Full-feature HabitEye (Option A) - single-file app logic
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Data & mappings ---------- */
  const HABITS = [
    { key:'exercise', title:'30 min Exercise', emoji:'🏃', sdg:'SDG 3' },
    { key:'sleep', title:'7–8 hrs Sleep', emoji:'😴', sdg:'SDG 3' },
    { key:'water', title:'Drink 2L Water', emoji:'💧', sdg:'SDG 3' },
    { key:'walk', title:'Walk / Transport', emoji:'🚶', sdg:'SDG 3' },
    { key:'meal', title:'Healthy Meal', emoji:'🥗', sdg:'SDG 3' },
    { key:'meditate', title:'5-min Meditation', emoji:'🧘', sdg:'SDG 3' },
    { key:'screen', title:'Limit Screen Time', emoji:'📵', sdg:'SDG 3' },
    { key:'study', title:'Study / Learn 30m', emoji:'📚', sdg:'SDG 3' },
    { key:'nojunk', title:'Avoid Junk Food', emoji:'🚫', sdg:'SDG 3' },
    { key:'reusable', title:'Use Reusable Bottle/Bag', emoji:'🔁', sdg:'SDG 12' },
    { key:'segregate', title:'Segregate Waste', emoji:'🗑️', sdg:'SDG 12' },
    { key:'savepower', title:'Save Electricity', emoji:'💡', sdg:'SDG 12' },
    { key:'noPlastic', title:'Avoid Plastic Bag', emoji:'🛍️', sdg:'SDG 12' },
    { key:'compost', title:'Compost / Reduce Waste', emoji:'🌿', sdg:'SDG 12' }
  ];

  const SUGGESTIONS = {
    'exercise': {title:'Move a bit', text:'Try 5 min walk or stretching now. 💪'},
    'sleep': {title:'Sleep tip', text:'Wind down 30 min before bed; avoid screens. 🌙'},
    'water': {title:'Hydration', text:'Keep a bottle nearby and sip regularly. 💧'},
    'walk': {title:'Walk more', text:'Take the stairs or a short walk during break. 🚶‍♀️'},
    'meal': {title:'Healthy meal', text:'Add a colorful salad or fruit to your plate. 🥗'},
    'meditate': {title:'Breathe', text:'Try 5 deep breaths or a quick guided session. 🧘'},
    'screen': {title:'Screen break', text:'Use Pomodoro: 25/5 to limit screen fatigue. ⏳'},
    'study': {title:'Tiny focus', text:'Set 25min focused session and a small reward. 📖'},
    'nojunk': {title:'Snack swap', text:'Replace chips with nuts or fruit. 🍎'},
    'reusable': {title:'Be ready', text:'Keep reusable bag/bottle near door. ♻️'},
    'segregate': {title:'Sort waste', text:'Start two bins: wet & dry. 🗂️'},
    'savepower': {title:'Power tip', text:'Unplug chargers and turn off lights when not in use. 🔌'},
    'noPlastic': {title:'Plastic-free', text:'Use cloth or paper alternatives. 🌱'},
    'compost': {title:'Compost', text:'Collect kitchen scraps for composting. 🧺'}
  };

  const DEFAULT_TIPS = [
    {title:'Hydrate', text:'Drink a glass of water each hour.'},
    {title:'Micro-move', text:'Stand up and stretch every hour.'},
    {title:'Prepare', text:'Prep one healthy snack for tomorrow.'}
  ];

  /* ---------- DOM refs ---------- */
  const startBtn = document.getElementById('startBtn');
  const welcome = document.getElementById('welcome');
  const dashboard = document.getElementById('dashboard');
  const habitList = document.getElementById('habitList');
  const finishBtn = document.getElementById('finishBtn');
  const prevBtn = document.getElementById('prevBtn');
  const clearBtn = document.getElementById('clearBtn');
  const suggestionsWrap = document.getElementById('suggestionsWrap');
  const suggestionsEl = document.getElementById('suggestions');
  const todayScoreEl = document.getElementById('todayScore');
  const pointsEl = document.getElementById('points');
  const badgesEl = document.getElementById('badges');
  const toast = document.getElementById('toast');

  const dailyText = document.getElementById('dailyText');
  const dailyCheck = document.getElementById('dailyCheck');
  const dailyReward = document.getElementById('dailyReward');
  const challengeDate = document.getElementById('challengeDate');

  const LS_SCORES = 'habit_weekly_scores';
  const LS_POINTS = 'habit_points';
  const LS_BADGES = 'habit_badges';
  const LS_DAILY = 'habit_daily_challenge';

  let points = parseInt(localStorage.getItem(LS_POINTS) || '0', 10) || 0;
  let badges = JSON.parse(localStorage.getItem(LS_BADGES) || '[]');

  /* ---------- Moving Quotes ---------- */
  const QUOTES = [
    "Success is the sum of small efforts repeated daily.",
    "Your future is created by what you do today, not tomorrow.",
    "Discipline is choosing what you want MOST over what you want NOW.",
    "Health is wealth — one habit at a time."
  ];
  let qidx = 0;
  const movingQuote = document.getElementById('movingQuote');
  function rotateQuote(){ movingQuote.textContent = QUOTES[qidx]; qidx=(qidx+1)%QUOTES.length; }
  rotateQuote(); setInterval(rotateQuote, 4200);

  /* ---------- Daily Challenge (changes by date) ---------- */
  const DAILY = [
    'Walk 20 minutes 🚶',
    'No sugary drinks today 🚫🥤',
    'Screen-free evening (1 hour) 📵',
    'Prepare a healthy meal 🥗',
    '10 minutes stretching 🧘',
    'Carry a reusable bottle ♻️',
    'Read 20 minutes 📚'
  ];

  function getDailyForDate(d){
    const key = d.toISOString().slice(0,10);
    let sum = 0; for(let i=0;i<key.length;i++) sum += key.charCodeAt(i);
    return DAILY[sum % DAILY.length];
  }

  function renderDailyChallenge(){
    const today = new Date();
    challengeDate.textContent = today.toDateString();
    const saved = JSON.parse(localStorage.getItem(LS_DAILY) || '{}');
    const todayKey = new Date().toISOString().slice(0,10);
    let challengeText;
    if(saved.date === todayKey && saved.text){
      challengeText = saved.text;
      if(saved.completed) dailyCheck.checked = true;
    } else {
      challengeText = getDailyForDate(today);
      localStorage.setItem(LS_DAILY, JSON.stringify({date:todayKey,text:challengeText,completed:false}));
      dailyCheck.checked = false;
    }
    dailyText.textContent = challengeText;
    dailyReward.style.display = (dailyCheck.checked ? 'block' : 'none');
  }

  dailyCheck.addEventListener('change', ()=>{
    const stored = JSON.parse(localStorage.getItem(LS_DAILY) || '{}');
    const todayKey = new Date().toISOString().slice(0,10);
    stored.date = todayKey; stored.text = stored.text || getDailyForDate(new Date()); stored.completed = !!dailyCheck.checked;
    localStorage.setItem(LS_DAILY, JSON.stringify(stored));
    if(dailyCheck.checked){
      // reward badge for daily challenge
      if(!badges.includes('Daily Challenger')){
        badges.push('Daily Challenger'); localStorage.setItem(LS_BADGES, JSON.stringify(badges)); renderBadges();
        showToast('Badge unlocked: Daily Challenger 🏅');
      }
      dailyReward.style.display = 'block';
    } else {
      dailyReward.style.display = 'none';
    }
  });

  /* ---------- Render habits list ---------- */
  function renderHabits(){
    habitList.innerHTML = '';
    HABITS.forEach(h=>{
      const div = document.createElement('div');
      div.className = 'habit';
      const id = `cb-${h.key}`;
      div.innerHTML = `<div class="left"><div class="emoji">${h.emoji}</div>
        <div><div class="title">${h.title}</div><div class="sdg">${h.sdg}</div></div></div>
        <div><input type="checkbox" id="${id}"></div>`;
      habitList.appendChild(div);
      document.getElementById(id).addEventListener('change', ()=>{
        updateTodayScore();
      });
    });
    updateTodayScore();
  }

  function updateTodayScore(){
    const done = HABITS.filter(h => document.getElementById(`cb-${h.key}`)?.checked).length;
    const pct = Math.round((done / HABITS.length) * 100);
    todayScoreEl.textContent = pct + '%';
  }

  /* ---------- Finish Day: show suggestions for MISSED + default tips; award points ---------- */
  finishBtn.addEventListener('click', ()=>{
    const missed = HABITS.filter(h => !(document.getElementById(`cb-${h.key}`)?.checked));
    suggestionsEl.innerHTML = '';

    if(missed.length){
      missed.forEach(m=>{
        const s = SUGGESTIONS[m.key] || {title:m.title,text:'Try again tomorrow.'};
        const node = document.createElement('div'); node.className='suggestion';
        node.innerHTML = `<div>❗</div><div><div class="txt">${s.title}</div><div class="sub">${s.text}</div></div>`;
        suggestionsEl.appendChild(node);
      });
    } else {
      const node = document.createElement('div'); node.className='suggestion';
      node.innerHTML = `<div>🎉</div><div><div class="txt">Perfect Day!</div><div class="sub">You completed everything — awesome.</div></div>`;
      suggestionsEl.appendChild(node);
      // perfect badge
      if(!badges.includes('Perfect Day')){ badges.push('Perfect Day'); localStorage.setItem(LS_BADGES, JSON.stringify(badges)); renderBadges(); showToast('Badge: Perfect Day 🏆'); }
    }

    // add 2 default tips
    const defaults = DEFAULT_TIPS.slice().sort(()=>0.5 - Math.random()).slice(0,2);
    defaults.forEach(t=>{
      const node = document.createElement('div'); node.className='suggestion';
      node.innerHTML = `<div>💡</div><div><div class="txt">${t.title}</div><div class="sub">${t.text}</div></div>`;
      suggestionsEl.appendChild(node);
    });

    suggestionsWrap.style.display = 'block';

    // award points
    const pct = parseInt(todayScoreEl.textContent,10) || 0;
    const earned = Math.round((pct/100) * (HABITS.length * 10)); // example formula
    points += earned; localStorage.setItem(LS_POINTS, points); pointsEl.textContent = points;

    // save daily score to weekly storage
    saveDailyScore(pct);

    showToast(`Finished — +${earned} pts`);
  });

  /* ---------- Clear today's checks ---------- */
  clearBtn.addEventListener('click', ()=>{
    HABITS.forEach(h => { const cb = document.getElementById(`cb-${h.key}`); if(cb) cb.checked = false; });
    suggestionsWrap.style.display = 'none';
    updateTodayScore();
  });

  /* ---------- Previous button (back to welcome) ---------- */
  prevBtn.addEventListener('click', ()=>{
    dashboard.style.display = 'none'; welcome.style.display = 'flex';
  });

  /* ---------- Points, badges ---------- */
  function renderBadges(){
    badgesEl.innerHTML = '';
    (badges || []).forEach(b=>{
      const el = document.createElement('div'); el.className='badge'; el.textContent = b; badgesEl.appendChild(el);
    });
  }

  /* ---------- Toast ---------- */
  function showToast(msg, time=2200){
    toast.textContent = msg; toast.style.display = 'block';
    setTimeout(()=> toast.style.display = 'none', time);
  }

  /* ---------- Weekly chart (Chart.js) ---------- */
  let chart = null;
  function loadChart(){
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0,0,0,220);
    gradient.addColorStop(0,'rgba(0,200,83,0.35)');
    gradient.addColorStop(1,'rgba(0,200,83,0.02)');
    const data = loadWeeklyScores();
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
      type:'line',
      data:{ labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets:[{ data, borderColor:'#00c853', backgroundColor:gradient, tension:0.4, borderWidth:3, pointRadius:5 }]},
      options:{ responsive:true, animation:{duration:1200,easing:'easeInOutQuart'}, scales:{y:{beginAtZero:true,max:100}}, plugins:{legend:{display:false}} }
    });
  }

  /* ---------- weekly scores storage ---------- */
  function loadWeeklyScores(){
    const raw = JSON.parse(localStorage.getItem(LS_SCORES) || '[]'); const map={}; raw.forEach(r=>map[r.date]=r.score);
    const arr=[]; const now=new Date();
    for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); const key=d.toISOString().slice(0,10); arr.push(map[key] ?? 0); }
    return arr;
  }
  function saveDailyScore(score){
    const key = new Date().toISOString().slice(0,10);
    const raw = JSON.parse(localStorage.getItem(LS_SCORES) || '[]');
    const idx = raw.findIndex(r=>r.date===key);
    if(idx>=0) raw[idx]={date:key,score}; else raw.push({date:key,score});
    while(raw.length>28) raw.shift();
    localStorage.setItem(LS_SCORES, JSON.stringify(raw));
    loadChart();
  }

  /* ---------- Load persisted data ---------- */
  function loadState(){
    points = parseInt(localStorage.getItem(LS_POINTS) || '0',10) || 0;
    badges = JSON.parse(localStorage.getItem(LS_BADGES) || '[]') || [];
    pointsEl.textContent = points;
    renderBadges();
    // daily challenge render
    renderDailyChallenge();
  }

  function renderDailyChallenge(){
    const saved = JSON.parse(localStorage.getItem(LS_DAILY) || '{}');
    const todayKey = new Date().toISOString().slice(0,10);
    if(saved.date === todayKey && saved.text){
      dailyText.textContent = saved.text; dailyCheck.checked = !!saved.completed; dailyReward.style.display = saved.completed ? 'block':'none';
    } else {
      const text = getDailyForDate(new Date());
      localStorage.setItem(LS_DAILY, JSON.stringify({date:todayKey,text,completed:false}));
      dailyText.textContent = text; dailyCheck.checked = false; dailyReward.style.display='none';
    }
    challengeDate.textContent = (new Date()).toDateString();
  }

  /* ---------- Dark mode toggle ---------- */
  const darkToggle = document.getElementById('darkToggle');
  const DARK_KEY = 'habit_dark';
  function applyDark(d){
    if(d) document.body.classList.add('dark'); else document.body.classList.remove('dark');
    localStorage.setItem(DARK_KEY, d ? '1':'0');
  }
  darkToggle.addEventListener('click', ()=>{
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem(DARK_KEY, isDark ? '1':'0');
  });
  // apply saved
  if(localStorage.getItem(DARK_KEY) === '1') applyDark(true);

  /* ---------- Start button ---------- */
  startBtn.addEventListener('click', ()=>{
    welcome.style.display = 'none'; dashboard.style.display = 'block';
    renderHabits(); loadState(); loadChart();
  });

  // initial small tasks: prepare canvas to avoid blank canvas
  // create a dummy chart now, chart will be replaced when loadChart called
  (function prepareCanvas(){
    const c = document.getElementById('weeklyChart');
    if(c) c.width = c.clientWidth;
  })();

  // safe initial render of welcome moving quote already started
}); // DOMContentLoaded end
