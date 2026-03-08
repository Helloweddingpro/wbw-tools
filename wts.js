// WBW Tools — Where To Start
// Supabase is loaded via global includes separately
(function() {
  // Only run on Where To Start page
  if (!document.getElementById('wts-root')) return;

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mbvdmvmwduidwmirndvu.supabase.co";
const SUPABASE_KEY = "sb_publishable_CS3XLLfWaZNA-B2oE37N-g_z2FMWCzq";
// Safe init — reuse existing client if already created on this page
if (!window._wbwSb) {
  window._wbwSb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storageKey: 'wbw-auth', autoRefreshToken: true, persistSession: true }
  });
}
const sb = window._wbwSb;
let currentUser = null;

// ── AUTH ──────────────────────────────────────────────────────────────────────
function switchTab(t) {
  document.getElementById('form-in').style.display = t==='in' ? '' : 'none';
  document.getElementById('form-up').style.display = t==='up' ? '' : 'none';
  document.querySelectorAll('.auth-tab').forEach((el,i)=> el.classList.toggle('active', (t==='in'&&i===0)||(t==='up'&&i===1)));
}
async function signIn() {
  const email = document.getElementById('in-email').value.trim();
  const pass = document.getElementById('in-pass').value;
  const msg = document.getElementById('in-msg');
  const btn = document.getElementById('in-btn');
  if (!email||!pass) { showMsg(msg,'Please enter email and password.','error'); return; }
  btn.disabled=true; btn.textContent='Signing in…';
  const {error} = await sb.auth.signInWithPassword({email,password:pass});
  btn.disabled=false; btn.textContent='Sign In';
  if (error) showMsg(msg,error.message,'error');
}
async function signUp() {
  const email = document.getElementById('up-email').value.trim();
  const pass = document.getElementById('up-pass').value;
  const msg = document.getElementById('up-msg');
  const btn = document.getElementById('up-btn');
  if (!email||!pass) { showMsg(msg,'Please enter email and password.','error'); return; }
  if (pass.length<6) { showMsg(msg,'Password must be at least 6 characters.','error'); return; }
  btn.disabled=true; btn.textContent='Creating account…';
  const {error} = await sb.auth.signUp({email,password:pass});
  btn.disabled=false; btn.textContent='Create Account';
  if (error) showMsg(msg,error.message,'error');
  else { showMsg(msg,'Account created! Check your email to confirm, then sign in.','success'); switchTab('in'); document.getElementById('in-email').value=email; }
}
async function signOut() {
  await sb.auth.signOut();
  document.getElementById('app-screen').style.display='none';
  document.getElementById('auth-screen').style.display='flex';
  resetAssessment();
}
function showMsg(el,text,type) { el.textContent=text; el.className='auth-msg '+type; }

sb.auth.onAuthStateChange(async (event,session) => {
  if (session?.user) {
    currentUser = session.user;
    document.getElementById('auth-screen').style.display='none';
    document.getElementById('app-screen').style.display='block';
    document.getElementById('user-email').textContent = currentUser.email;
    await checkExistingResults();
  } else {
    currentUser = null;
    document.getElementById('app-screen').style.display='none';
    document.getElementById('auth-screen').style.display='flex';
  }
});

async function checkExistingResults() {
  try {
    const {data} = await sb.from('where_to_start').select('data').eq('user_id', currentUser.id).order('updated_at', {ascending:false}).limit(1);
    if (data && data.length > 0) {
      showResults(data[0].data.scores, data[0].data.answers, true);
    }
  } catch(e) { /* table may not exist yet, that's fine */ }
}

async function saveResults(scores, answers) {
  if (!currentUser) return;
  try {
    await sb.from('where_to_start').upsert({
      id: currentUser.id,
      user_id: currentUser.id,
      data: { scores, answers, completedAt: new Date().toISOString() },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    showToast();
  } catch(e) { console.log('Save note:', e.message); }
}

function showToast() {
  const t = document.getElementById('save-toast');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

// ── QUESTIONS ─────────────────────────────────────────────────────────────────
const SECTIONS = {
  pricing:   { label: 'Pricing Confidence',    color: '#FB478E', tool: 'Income & Pricing Planner' },
  leads:     { label: 'Lead Tracking',          color: '#3B3C6D', tool: 'Lead Tracker' },
  ica:       { label: 'Most Profitable Couples',   color: '#7C6FCD', tool: 'Ideal Client Clarity' },
  social:    { label: 'Social Media',           color: '#E8845C', tool: 'Social Media Planner' },
  income:    { label: 'Income Goals',           color: '#2DA05A', tool: 'Income & Pricing Planner' },
};

const QUESTIONS = [
  {
    id: 'q1', section: 'pricing', type: 'choice',
    text: 'How do you currently decide what to charge for a wedding?',
    sub: 'Be honest — there\'s no right answer here.',
    choices: [
      { text: 'I look at what others charge and match or undercut them', score: 1 },
      { text: 'I charge what feels right — but I\'m not fully confident in it', score: 2 },
      { text: 'I have a rough figure but I sometimes drop it when pushed', score: 2 },
      { text: 'I have a minimum price based on my income goals and I hold it', score: 4 },
    ]
  },
  {
    id: 'q2', section: 'pricing', type: 'slider',
    text: 'How confident are you presenting your price to a couple at a top venue — without apologising for it?',
    sub: '1 = I find it really uncomfortable, 5 = completely confident',
    min: 1, max: 5, default: 3,
  },
  {
    id: 'q3', section: 'leads', type: 'choice',
    text: 'What happens when an enquiry comes in right now?',
    sub: 'Pick the one that best describes your current process.',
    choices: [
      { text: 'I reply when I remember — no real system', score: 1 },
      { text: 'I reply quickly but don\'t track what happens after', score: 2 },
      { text: 'I have a rough follow-up process but it\'s inconsistent', score: 2 },
      { text: 'I have a clear system — I track every lead and follow up consistently', score: 4 },
    ]
  },
  {
    id: 'q4', section: 'leads', type: 'slider',
    text: 'How often do you follow up after sending a quote with no response?',
    sub: '1 = never / rarely, 5 = always — I have a clear follow-up plan',
    min: 1, max: 5, default: 2,
  },
  {
    id: 'q5', section: 'ica', type: 'choice',
    text: 'How clearly can you describe your most profitable couple right now?',
    sub: 'Think about your best bookings — the ones that paid well, felt easy and you\'d love more of.',
    choices: [
      { text: 'I take whoever enquires — I haven\'t thought about it', score: 1 },
      { text: 'I have a feeling for who I love working with but nothing defined', score: 2 },
      { text: 'I know who they are but haven\'t built my marketing around them', score: 3 },
      { text: 'I have a clear profile — venue type, career, values — and I market directly to them', score: 4 },
    ]
  },
  {
    id: 'q6', section: 'ica', type: 'slider',
    text: 'How focused is your marketing on attracting the most profitable couples — rather than anyone who might book?',
    sub: '1 = I\'m trying to appeal to everyone, 5 = everything I do is targeted at the right couple',
    min: 1, max: 5, default: 2,
  },
  {
    id: 'q7', section: 'social', type: 'choice',
    text: 'How would you describe your social media presence right now?',
    sub: 'Pick the most honest answer.',
    choices: [
      { text: 'Inconsistent — I post when I remember', score: 1 },
      { text: 'Fairly regular but with no clear strategy or message', score: 2 },
      { text: 'I post consistently but I\'m not sure it\'s attracting the right couples', score: 3 },
      { text: 'Consistent, intentional and bringing in the right enquiries', score: 4 },
    ]
  },
  {
    id: 'q8', section: 'social', type: 'slider',
    text: 'How clear are you on what to post to attract more of your most profitable couples?',
    sub: '1 = I have no idea what to post, 5 = I have a clear content strategy that works',
    min: 1, max: 5, default: 2,
  },
  {
    id: 'q9', section: 'income', type: 'choice',
    text: 'Do you have a clear income goal for this year — and do you know if you\'re on track?',
    sub: 'Think about whether you\'re running your business with a plan or hoping for the best.',
    choices: [
      { text: 'No — I don\'t have a specific income goal', score: 1 },
      { text: 'I have a rough number in my head but nothing written down', score: 2 },
      { text: 'I have a goal but I\'m not actively tracking progress', score: 2 },
      { text: 'I have a clear goal and I track my bookings against it regularly', score: 4 },
    ]
  },
  {
    id: 'q10', section: 'income', type: 'slider',
    text: 'How clearly does your pricing reflect what you actually need to earn to have a comfortable income?',
    sub: '1 = I have no idea if my prices are right, 5 = my prices are built around my income goals',
    min: 1, max: 5, default: 2,
  },
];

// ── ASSESSMENT STATE ──────────────────────────────────────────────────────────
let currentQ = 0;
let answers = {};

function startAssessment() {
  document.getElementById('intro-screen').style.display = 'none';
  document.getElementById('question-screen').style.display = 'block';
  currentQ = 0;
  answers = {};
  renderQuestion();
}

function resetAssessment() {
  currentQ = 0;
  answers = {};
  document.getElementById('intro-screen').style.display = 'block';
  document.getElementById('question-screen').style.display = 'none';
  document.getElementById('results-screen').style.display = 'none';
  document.getElementById('results-screen').innerHTML = '';
}

function renderQuestion() {
  const q = QUESTIONS[currentQ];
  const total = QUESTIONS.length;
  const pct = Math.round((currentQ / total) * 100);

  document.getElementById('prog-label').textContent = `Question ${currentQ+1} of ${total}`;
  document.getElementById('prog-pct').textContent = pct + '%';
  document.getElementById('prog-fill').style.width = pct + '%';

  const section = SECTIONS[q.section];
  const existing = answers[q.id];

  let inner = '';

  if (q.type === 'choice') {
    inner = `
      <div class="section-label" style="background:${section.color}">${section.label}</div>
      <div class="q-number">Question ${currentQ+1}</div>
      <div class="q-text">${q.text}</div>
      <div class="q-sub">${q.sub}</div>
      <div class="choices">
        ${q.choices.map((c,i) => `
          <button class="choice-btn ${existing?.index===i?'selected':''}" onclick="selectChoice(${i}, ${c.score})" data-idx="${i}">
            <div class="choice-dot"></div>
            <span>${c.text}</span>
          </button>
        `).join('')}
      </div>
    `;
  } else {
    const val = existing?.value ?? q.default;
    inner = `
      <div class="section-label" style="background:${section.color}">${section.label}</div>
      <div class="q-number">Question ${currentQ+1}</div>
      <div class="q-text">${q.text}</div>
      <div class="q-sub">${q.sub}</div>
      <div class="slider-wrap">
        <div class="slider-labels"><span>${q.min} — ${q.min===1?'Not at all':'Low'}</span><span>${q.max===5?'Completely':q.max}</span></div>
        <input type="range" min="${q.min}" max="${q.max}" value="${val}" id="slider-${q.id}" oninput="updateSlider(this)">
        <div class="slider-value" id="slider-val-${q.id}">${val}<span>/ ${q.max}</span></div>
      </div>
    `;
  }

  const canNext = q.type === 'slider' ? true : (existing !== undefined);

  document.getElementById('q-mount').innerHTML = `
    <div class="q-card">
      ${inner}
      <div class="q-nav">
        <button class="nav-back" onclick="goBack()" style="${currentQ===0?'visibility:hidden':''}">← Back</button>
        <button class="nav-next" id="next-btn" onclick="goNext()" ${!canNext?'disabled':''}>
          ${currentQ===total-1?'See my results →':'Next →'}
        </button>
      </div>
    </div>
  `;

  // Set slider gradient
  if (q.type === 'slider') {
    updateSlider(document.getElementById(`slider-${q.id}`));
  }
}

function selectChoice(idx, score) {
  const q = QUESTIONS[currentQ];
  answers[q.id] = { index: idx, score, section: q.section };
  document.querySelectorAll('.choice-btn').forEach((btn,i) => btn.classList.toggle('selected', i===idx));
  document.getElementById('next-btn').disabled = false;
}

function updateSlider(el) {
  const q = QUESTIONS[currentQ];
  const val = Number(el.value);
  const pct = ((val - q.min) / (q.max - q.min)) * 100;
  el.style.background = `linear-gradient(90deg, var(--pink) ${pct}%, #e8e8f0 ${pct}%)`;
  const valEl = document.getElementById(`slider-val-${q.id}`);
  if (valEl) valEl.innerHTML = `${val}<span>/ ${q.max}</span>`;
  // score: sliders are 1-5, normalise to 1-4
  const score = Math.round(1 + (val - q.min) / (q.max - q.min) * 3);
  answers[q.id] = { value: val, score, section: q.section };
}

function goNext() {
  const q = QUESTIONS[currentQ];
  // ensure slider answer saved
  if (q.type === 'slider') {
    const el = document.getElementById(`slider-${q.id}`);
    if (el) updateSlider(el);
  }
  if (!answers[q.id]) return;

  if (currentQ < QUESTIONS.length - 1) {
    currentQ++;
    renderQuestion();
    document.getElementById('q-mount').scrollIntoView({behavior:'smooth', block:'start'});
  } else {
    finishAssessment();
  }
}

function goBack() {
  if (currentQ > 0) { currentQ--; renderQuestion(); }
}

// ── SCORING ───────────────────────────────────────────────────────────────────
function finishAssessment() {
  // Calculate scores per section (max 8 per section = 2 questions × max 4)
  const scores = {};
  for (const key of Object.keys(SECTIONS)) {
    const sectionAnswers = Object.values(answers).filter(a => a.section === key);
    const total = sectionAnswers.reduce((s,a) => s + (a.score||0), 0);
    const max = sectionAnswers.length * 4;
    scores[key] = { raw: total, max, pct: max ? Math.round((total/max)*100) : 0 };
  }

  saveResults(scores, answers);
  showResults(scores, answers, false);
}

// ── RESULTS ───────────────────────────────────────────────────────────────────
function showResults(scores, ans, returning) {
  document.getElementById('intro-screen').style.display = 'none';
  document.getElementById('question-screen').style.display = 'none';
  document.getElementById('results-screen').style.display = 'block';

  // Sort sections by score ascending (biggest gap first)
  const sorted = Object.entries(scores)
    .map(([key, s]) => ({ key, ...s, ...SECTIONS[key] }))
    .sort((a,b) => a.pct - b.pct);

  const biggest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  // Classify each section
  function classify(pct) {
    if (pct >= 75) return 'strong';
    if (pct >= 45) return 'mid';
    return 'weak';
  }

  // Personalised insights per section
  const insights = {
    pricing: {
      weak: { icon: '💰', text: 'You\'re likely undercharging — or dropping your price when couples push back. The most profitable couples at top venues don\'t choose their suppliers on price. They choose on trust and quality. A clear income-based minimum price gives you the confidence to hold your rate.' },
      mid:  { icon: '💰', text: 'Your pricing is developing but there\'s still room to build conviction. When you know exactly what you need to earn and why your price is what it is, you stop second-guessing yourself in front of couples.' },
      strong: { icon: '💰', text: 'You have solid pricing foundations. Make sure your confidence comes through in your enquiry replies — the way you present your price is just as important as the number itself.' },
    },
    leads: {
      weak: { icon: '📋', text: 'Enquiries are slipping through the cracks. The most profitable couples often enquire with multiple suppliers — whoever follows up best wins the booking. A consistent system means you never lose a great lead to a competitor simply because they responded more consistently.' },
      mid:  { icon: '📋', text: 'You\'re responding but the follow-up is inconsistent. Most bookings happen after the second or third follow-up — not the first reply. A clear tracking system makes sure no couple falls through.' },
      strong: { icon: '📋', text: 'Your lead process is working well. Now look at your source data — which venues are generating your best enquiries? That\'s where your content focus should be.' },
    },
    ica: {
      weak: { icon: '🎯', text: 'Without knowing who your most profitable couple is, your marketing speaks to everyone — and connects with no one. Career couples at top venues are looking for suppliers who feel right for them. If your content doesn\'t speak directly to that couple, they\'ll scroll past.' },
      mid:  { icon: '🎯', text: 'You have a sense of who you love working with but it\'s not fully defined yet. Once you get clear on your most profitable couple — their venue, their values, how they found you — your content and enquiry replies will feel completely different.' },
      strong: { icon: '🎯', text: 'You know your most profitable couple well. Now look at your top venues — are you creating content that speaks directly to couples who book there? Venue-specific content is one of the most powerful ways to attract the right enquiries.' },
    },
    social: {
      weak: { icon: '📱', text: 'Inconsistent social media means the couples you most want to attract aren\'t seeing you. The fix isn\'t posting more — it\'s posting with purpose. Content focused on the venues your most profitable couples book is far more effective than general work.' },
      mid:  { icon: '📱', text: 'You\'re showing up but without a clear enough message. Once you know your most profitable couple and the venues they book, your content becomes intentional — every post is working to attract the right enquiry.' },
      strong: { icon: '📱', text: 'Your social media is working well. Look at which posts are generating the most enquiries and double down on that content. If a venue keeps coming up in your leads, post more about it — that\'s your audience telling you what they want to see.' },
    },
    income: {
      weak: { icon: '📈', text: 'Without an income goal, every booking feels like a win even if it\'s not moving you forward. Knowing your number — what you need to earn to live comfortably — changes how you price, how many weddings you take on, and which enquiries you prioritise.' },
      mid:  { icon: '📈', text: 'You have a sense of where you want to get to but you\'re not tracking it consistently. When your income goal is connected to your bookings in real time, you always know if you\'re on track — and what needs to change if you\'re not.' },
      strong: { icon: '📈', text: 'You have strong financial clarity. Make sure your income goal is directly shaping your minimum price — the two should be locked together so every booking is moving you towards the life you want.' },
    },
  };

  // Venue strategy insight — shown in results regardless of scores
  const venueInsight = `💡 <strong>Venue strategy tip:</strong> The most profitable couples in Ireland and the UK book their suppliers based on fit, not price. Focusing your marketing on the top venues in your area — and becoming known as the go-to supplier at those venues — is one of the fastest ways to attract more of the right enquiries.`;

  // Recommended tool start order based on scores
  const toolOrder = sorted.map((s, i) => ({
    step: i + 1,
    tool: s.tool,
    area: s.label,
    pct: s.pct,
    why: i === 0
      ? `This is your biggest gap right now. Starting here will have the most immediate impact on your bookings.`
      : i === 1
      ? `Your second priority once you\'ve made a start on ${sorted[0].label.toLowerCase()}.`
      : `Build this once your foundations are in place.`
  }));

  // Dedupe tools (income & pricing appear in two sections)
  const seenTools = new Set();
  const uniqueToolOrder = toolOrder.filter(t => {
    if (seenTools.has(t.tool)) return false;
    seenTools.add(t.tool);
    return true;
  });

  const biggestInsight = insights[biggest.key]?.[classify(biggest.pct)];
  const strongestInsight = insights[strongest.key]?.[classify(strongest.pct)];

  document.getElementById('results-screen').innerHTML = `
    <div class="results-hero">
      <div class="results-eyebrow">Your Business Assessment</div>
      <div class="results-name">Here's where you are right now</div>
      <div class="results-tagline">We've identified your biggest opportunity and mapped out exactly where to focus first to get more bookings.</div>
    </div>

    <div class="score-grid">
      ${sorted.map(s => `
        <div class="score-card ${classify(s.pct)}">
          <div class="score-area">${s.label}</div>
          <div class="score-bar-bg"><div class="score-bar-fill" style="width:${s.pct}%"></div></div>
          <div class="score-pct">${s.pct}% — ${classify(s.pct)==='strong'?'Strong':classify(s.pct)==='mid'?'Developing':'Needs work'}</div>
        </div>
      `).join('')}
    </div>

    <div class="start-here-card">
      <div class="start-here-label">🚀 Start here first</div>
      <div class="start-here-tool">${biggest.tool}</div>
      <div class="start-here-reason">${biggestInsight?.text || ''} This is the tool that will move the needle most for you right now.</div>
    </div>

    <div class="insight-grid">
      <div class="insight-box gap">
        <div class="insight-icon">${insights[biggest.key]?.[classify(biggest.pct)]?.icon || '⚠️'}</div>
        <div class="insight-label">Biggest gap</div>
        <div class="insight-text">${biggest.label} — ${biggest.pct}%<br><span style="font-weight:600;opacity:.8;">${biggest.tool}</span></div>
      </div>
      <div class="insight-box strength">
        <div class="insight-icon">${insights[strongest.key]?.[classify(strongest.pct)]?.icon || '✨'}</div>
        <div class="insight-label">Strongest area</div>
        <div class="insight-text">${strongest.label} — ${strongest.pct}%<br><span style="font-weight:600;opacity:.8;">${strongestInsight?.text?.split('.')[0] || 'Keep building on this.'}</span></div>
      </div>
    </div>

    <div class="roadmap-card">
      <div class="roadmap-title">Your recommended tool order</div>
      ${uniqueToolOrder.map((t, i) => `
        <div class="roadmap-step">
          <div class="roadmap-num ${i===0?'first':'rest'}">${i+1}</div>
          <div class="roadmap-info">
            <div class="roadmap-tool">${t.tool} <span style="font-size:11px;font-weight:700;color:#aaa;margin-left:6px;">${t.area}</span></div>
            <div class="roadmap-why">${t.why}</div>
          </div>
        </div>
      `).join('')}
    </div>

    ${sorted.map(s => {
      const cl = classify(s.pct);
      const ins = insights[s.key]?.[cl];
      return `
        <div style="background:#fff;border-radius:18px;padding:22px;margin-bottom:14px;box-shadow:0 2px 12px rgba(59,60,109,.05);">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="font-size:18px;">${ins?.icon||'📊'}</div>
            <div>
              <div style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#aaa;">${s.label}</div>
              <div style="font-size:16px;font-weight:800;color:var(--brand);">${s.pct}% — ${cl==='strong'?'✅ Strong':cl==='mid'?'🔶 Developing':'🔴 Needs attention'}</div>
            </div>
          </div>
          <div style="font-size:13px;font-weight:600;color:#555570;line-height:1.7;">${ins?.text||''}</div>
        </div>
      `;
    }).join('')}

    ${returning ? '<div style="background:#E9EEFF;border-radius:14px;padding:14px 18px;font-size:13px;font-weight:700;color:var(--brand);margin-bottom:20px;">📌 These are your saved results from a previous assessment.</div>' : ''}

    <div style="background:#F9E8ED;border-radius:18px;padding:22px;margin-bottom:20px;font-size:13px;font-weight:600;color:#3B3C6D;line-height:1.7;">
      ${venueInsight}
    </div>

    <div class="retake-wrap">
      <button class="retake-btn" id="retake-btn">Retake assessment</button>
    </div>
  `;

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.score-bar-fill').forEach(el => {
      const w = el.style.width;
      el.style.width = '0%';
      setTimeout(() => el.style.width = w, 100);
    });
  }, 100);
}

// ── WIRE UP BUTTONS ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  const el = id => document.getElementById(id);
  const on = (id, fn) => { const e = el(id); if(e) e.addEventListener('click', fn); };
  on('tab-in-btn', () => switchTab('in'));
  on('tab-up-btn', () => switchTab('up'));
  on('signin-btn', signIn);
  on('signup-btn', signUp);
  on('signout-btn', signOut);
  on('start-btn',  startAssessment);
  on('retake-btn', resetAssessment);
});

  // Wire up buttons
  document.addEventListener('DOMContentLoaded', function() {
    const on = (id, fn) => { const e = document.getElementById(id); if(e) e.addEventListener('click', fn); };
    on('tab-in-btn', () => switchTab('in'));
    on('tab-up-btn', () => switchTab('up'));
    on('signin-btn', signIn);
    on('signup-btn', signUp);
    on('signout-btn', signOut);
    on('start-btn',  startAssessment);
    on('retake-btn', resetAssessment);
  });
})();