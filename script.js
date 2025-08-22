// ======= State & Utils =======
const storageKey = 'advancedTaskManager.v1';
let state = {
  tasks: [],
  projects: ['Personal', 'Work', 'Study'],
  selectedTaskId: null,
  filters: { project:null, query:'', priority:'', status:'', from:null, to:null },
  theme: 'light'
};

// DOM caching
const DOM = {
  projectList: () => document.getElementById('projectList'),
  newProject: () => document.getElementById('newProject'),
  addProject: () => document.getElementById('addProject'),
  quickFilters: () => document.getElementById('quickFilters'),
  priorityFilter: () => document.getElementById('priorityFilter'),
  statusFilter: () => document.getElementById('statusFilter'),
  fromDate: () => document.getElementById('fromDate'),
  toDate: () => document.getElementById('toDate'),
  clearFilters: () => document.getElementById('clearFilters'),
  exportBtn: () => document.getElementById('exportBtn'),
  importFile: () => document.getElementById('importFile'),
  todayChip: () => document.getElementById('todayChip'),
  searchInput: () => document.getElementById('searchInput'),
  voiceBtn: () => document.getElementById('voiceBtn'),
  themeToggle: () => document.getElementById('themeToggle'),
  newTaskBtn: () => document.getElementById('newTaskBtn'),
  notifyBtn: () => document.getElementById('notifyBtn'),
  kanbanView: () => document.getElementById('kanbanView'),
  calendarView: () => document.getElementById('calendarView'),
  dashboardView: () => document.getElementById('dashboardView'),
  totalCount: () => document.getElementById('totalCount'),
  doneCount: () => document.getElementById('doneCount'),
  completionRate: () => document.getElementById('completionRate'),
  progressBar: () => document.getElementById('progressBar'),
  priorityChart: () => document.getElementById('priorityChart'),
  donePriorityChart: () => document.getElementById('donePriorityChart'),
  taskModal: () => document.getElementById('taskModal'),
  closeModal: () => document.getElementById('closeModal'),
  createTaskBtn: () => document.getElementById('createTaskBtn'),
  saveTaskBtn: () => document.getElementById('saveTaskBtn'),
  deleteTaskBtn: () => document.getElementById('deleteTaskBtn'),
  markDoneBtn: () => document.getElementById('markDoneBtn'),
  p_mode: () => document.getElementById('p_mode'),
  p_start: () => document.getElementById('p_start'),
  p_pause: () => document.getElementById('p_pause'),
  p_reset: () => document.getElementById('p_reset'),
  p_timer: () => document.getElementById('p_timer'),
  p_state: () => document.getElementById('p_state')
};

const $ = (sel,root=document) => root.querySelector(sel);
const $$ = (sel,root=document) => Array.from(root.querySelectorAll(sel));
const fmtDate = d => new Date(d).toISOString().slice(0,10);
const uid = () => Math.random().toString(36).slice(2,9);

function save(){ 
  localStorage.setItem(storageKey, JSON.stringify(state)); 
  render(); 
  updatePomodoroUI(); 
}

function load(){
  const raw = localStorage.getItem(storageKey);
  if(raw){ 
    try{ 
      const savedState = JSON.parse(raw);
      // Merge saved state with default state to ensure all properties exist
      state = {...state, ...savedState};
    } catch(e) {
      console.error('Error loading saved state:', e);
    } 
  }
  applyTheme();
}

function applyTheme() {
  document.body.className = state.theme;
}

function sampleData(){
  if(state.tasks.length) return;
  const today = fmtDate(new Date());
  const t = (o)=>({ 
    id: uid(), 
    title: o.title, 
    desc: o.desc||'', 
    project: o.project||'Personal', 
    priority: o.priority||'Medium', 
    status: o.status||'todo', 
    due: o.due||today, 
    dueTime: o.dueTime || '23:59',
    startDate: o.startDate || today,
    startTime: o.startTime || '09:00',
    deps: o.deps||[], 
    recurring: o.recurring||'none', 
    created: Date.now(), 
    completed: null, 
    pomodoro: {
      work: 25,
      break: 5,
      phase: 'work',
      remaining: 25*60, 
      running: false
    }
  });
  
  state.tasks = [
    t({title:'Design landing page', project:'Work', priority:'High', due:fmtDate(Date.now()+86400000)}),
    t({title:'Study DSA graphs', project:'Study', priority:'Medium', status:'inprogress'}),
    t({title:'Buy groceries', priority:'Low', status:'todo'}),
    t({title:'Submit assignment', project:'Study', priority:'High', due:fmtDate(Date.now()+2*86400000)}),
    t({title:'Morning workout', priority:'Medium', recurring:'daily', status:'done'}),
    t({title:'Write report', project:'Work', priority:'High', status:'done'}),
    t({title:'Prepare presentation', project:'Work', priority:'Medium', status:'done'})
  ];
}

// ======= Rendering =======
function render(){
  renderProjects();
  renderKanban();
  renderCalendar();
  renderDetails();
  renderDashboard();
  updateDatalists();
  DOM.todayChip().textContent = new Date().toLocaleDateString();
}

function renderProjects(){
  const list = DOM.projectList(); 
  list.innerHTML='';
  
  const all = document.createElement('div'); 
  all.className='item '+(state.filters.project===null?'active':''); 
  all.innerHTML='<span class="dot"></span>All Tasks';
  all.onclick=()=>{ state.filters.project=null; save(); };
  list.appendChild(all);
  
  state.projects.forEach(p=>{
    const el = document.createElement('div');
    el.className='item '+(state.filters.project===p?'active':'');
    el.innerHTML = `
      <span class="dot" style="background:var(--brand)"></span>
      <span class="project-name">${p}</span>
      <button class="delete-project right" data-project="${p}">✕</button>
    `;
    el.onclick=()=>{ state.filters.project=p; save(); };
    list.appendChild(el);
  });
  
  // Add event listeners to delete buttons
  $$('.delete-project').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the project selection
      const projectName = btn.dataset.project;
      deleteProject(projectName);
    });
  });
}

function deleteProject(projectName) {
  // Confirm deletion
  if (!confirm(`Delete project "${projectName}" and all its tasks? This action cannot be undone.`)) {
    return;
  }
  
  // Remove all tasks associated with this project
  state.tasks = state.tasks.filter(task => task.project !== projectName);
  
  // Remove the project from the projects list
  state.projects = state.projects.filter(p => p !== projectName);
  
  // If the current filter is set to the deleted project, reset to all projects
  if (state.filters.project === projectName) {
    state.filters.project = null;
  }
  
  // If the selected task was from this project, clear selection
  const selectedTask = state.tasks.find(t => t.id === state.selectedTaskId);
  if (!selectedTask || selectedTask.project === projectName) {
    state.selectedTaskId = null;
  }
  
  save();
}

function taskMatchesFilters(task){
  const f = state.filters;
  if(f.project && task.project!==f.project) return false;
  if(f.priority && task.priority!==f.priority) return false;
  if(f.status && task.status!==f.status) return false;
  if(f.from && task.due && task.due < f.from) return false;
  if(f.to && task.due && task.due > f.to) return false;
  const q = f.query.trim().toLowerCase();
  if(q){
    const hay = [task.title, task.desc, task.project, task.priority].join(' ').toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}

function createTaskCard(task){
  const card = document.createElement('div'); 
  card.className='task'; 
  card.draggable=true; 
  card.dataset.id=task.id;
  
  if(task.due && new Date(task.due) < new Date() && task.status!=='done') {
    card.classList.add('overdue');
  }
  
  card.innerHTML = `
    <div class="title">${task.title}</div>
    <div class="meta">
      <span class="badge ${task.priority==='High'?'priority-high':task.priority==='Medium'?'priority-medium':'priority-low'}">${task.priority}</span>
      ${task.due ? `<span class="badge">📅 ${task.due} ${task.dueTime ? task.dueTime : ''}</span>` : ''}
      <span class="badge">📁 ${task.project}</span>
    </div>`;
    
  card.addEventListener('click', ()=>{ 
    state.selectedTaskId = task.id; 
    save(); 
  });
  
  card.addEventListener('dragstart', e=>{ 
    card.classList.add('dragging'); 
    e.dataTransfer.setData('text/plain', task.id); 
  });
  
  card.addEventListener('dragend', ()=> card.classList.remove('dragging'));
  
  return card;
}

function renderKanban(){
  ['todo','inprogress','done'].forEach(st=>{ 
    $(`#${st}Col`).innerHTML=''; 
  });
  
  state.tasks.filter(taskMatchesFilters).forEach(t=>{
    $(`#${t.status}Col`).appendChild(createTaskCard(t));
  });
}

function renderCalendar(){
  const view = DOM.calendarView(); 
  view.innerHTML='';
  
  const now = new Date(); 
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(first); 
  start.setDate(first.getDate() - (first.getDay()||7) + 1); // ISO week start Mon
  
  for(let i=0;i<42;i++){
    const d = new Date(start); 
    d.setDate(start.getDate()+i);
    
    const box = document.createElement('div'); 
    box.className='day';
    
    const num = document.createElement('div'); 
    num.className='num'; 
    num.textContent = d.getDate(); 
    box.appendChild(num);
    
    const dateStr = fmtDate(d);
    const tasks = state.tasks.filter(t=>t.due===dateStr && taskMatchesFilters(t));
    
    tasks.slice(0,3).forEach(t=>{ 
      const b=document.createElement('div'); 
      b.className='badge'; 
      b.textContent='• '+t.title; 
      box.appendChild(b); 
    });
    
    const count = document.createElement('div'); 
    count.className='count'; 
    count.textContent = tasks.length?`+${tasks.length} due`:' ';
    box.appendChild(count);
    
    view.appendChild(box);
  }
}

function renderDetails(){
  const t = state.tasks.find(x=>x.id===state.selectedTaskId);
  const fields = ['d_title','d_project','d_priority','d_status','d_due','d_due_time','d_start','d_start_time','d_desc','d_recurring'];
  
  if(!t){ 
    fields.forEach(id=> $(`#${id}`).value=''); 
    $('#d_id').textContent='#—'; 
    $('#d_created').textContent='—'; 
    return; 
  }
  
  $('#d_title').value=t.title; 
  $('#d_project').value=t.project; 
  $('#d_priority').value=t.priority; 
  $('#d_status').value=t.status; 
  $('#d_due').value=t.due||''; 
  $('#d_due_time').value=t.dueTime||'23:59';
  $('#d_start').value=t.startDate||'';
  $('#d_start_time').value=t.startTime||'09:00';
  $('#d_recurring').value=t.recurring||'none';
  $('#d_desc').value=t.desc||''; 
  $('#d_id').textContent = '#'+t.id; 
  $('#d_created').textContent = new Date(t.created).toLocaleString();
}

function renderDashboard(){
  const tasks = state.tasks.filter(taskMatchesFilters);
  const total = tasks.length; 
  const done = tasks.filter(t=>t.status==='done').length;
  const completionRate = total ? Math.round(done/total*100) : 0;
  
  DOM.totalCount().textContent=total; 
  DOM.doneCount().textContent=done; 
  DOM.completionRate().textContent = completionRate + '%';
  DOM.progressBar().style.width=completionRate+'%';
  
  // Draw priority chart for all tasks
  drawPriorityChart('priorityChart', tasks);
  
  // Draw priority chart for done tasks only
  const doneTasks = tasks.filter(t => t.status === 'done');
  drawPriorityChart('donePriorityChart', doneTasks, true);
}

function drawPriorityChart(canvasId, tasks, isDoneChart = false) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Count tasks by priority
  const counts = {
    'High': tasks.filter(t => t.priority === 'High').length,
    'Medium': tasks.filter(t => t.priority === 'Medium').length,
    'Low': tasks.filter(t => t.priority === 'Low').length
  };
  
  const max = Math.max(1, ...Object.values(counts));
  const barWidth = 60;
  const gap = 40;
  const chartHeight = 180;
  let x = 50;
  
  // Set font
  ctx.font = '14px system-ui';
  ctx.textAlign = 'center';
  
  // Draw bars for each priority
  Object.entries(counts).forEach(([priority, count]) => {
    const barHeight = (count / max) * chartHeight;
    const y = canvas.height - barHeight - 30;
    
    // Set color based on priority
    ctx.fillStyle = priority === 'High' ? 'rgba(239,68,68,.7)' : 
                   priority === 'Medium' ? 'rgba(245,158,11,.7)' : 
                   'rgba(34,197,94,.7)';
    
    // Draw bar
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Draw value label
    ctx.fillStyle = 'var(--text)';
    ctx.fillText(count.toString(), x + barWidth/2, y - 5);
    
    // Draw priority label
    ctx.fillText(priority, x + barWidth/2, canvas.height - 10);
    
    x += barWidth + gap;
  });
  
  // Draw chart title
  ctx.font = 'bold 16px system-ui';
  ctx.fillStyle = 'var(--text)';
  ctx.textAlign = 'center';
  ctx.fillText(isDoneChart ? 'Completed Tasks by Priority' : 'All Tasks by Priority', canvas.width/2, 20);
}

function updateDatalists(){
  const dl = $('#projectDatalist'); 
  dl.innerHTML=''; 
  
  state.projects.forEach(p=>{ 
    const o=document.createElement('option'); 
    o.value=p; 
    dl.appendChild(o); 
  });
}

// ======= Drag & Drop =======
function initDragAndDrop(){
  $$('.dropzone').forEach(zone=>{
    zone.addEventListener('dragover', e=>{ e.preventDefault(); });
    
    zone.addEventListener('drop', e=>{
      const id = e.dataTransfer.getData('text/plain');
      const task = state.tasks.find(t=>t.id===id); 
      if(!task) return;
      
      const status = zone.parentElement.dataset.status; 
      task.status=status;
      
      // If moved to Done, set completedAt and handle recurring
      if(status==='done'){
        task.completed = Date.now(); 
        if(task.recurring && task.recurring!=='none'){ 
          createNextRecurring(task); 
        } 
      }
      
      state.selectedTaskId=id; 
      save();
    });
  });
}

// ======= Events =======
function initEvents(){
  DOM.addProject().onclick=()=>{ 
    const val=DOM.newProject().value.trim(); 
    if(!val) return; 
    if(!state.projects.includes(val)) state.projects.push(val); 
    DOM.newProject().value=''; 
    save(); 
  };
  
  DOM.clearFilters().onclick=()=>{ 
    state.filters={
      project: state.filters.project, 
      query:'', 
      priority:'', 
      status:'', 
      from:null, 
      to:null
    }; 
    
    DOM.searchInput().value=''; 
    DOM.priorityFilter().value=''; 
    DOM.statusFilter().value=''; 
    DOM.fromDate().value=''; 
    DOM.toDate().value=''; 
    save(); 
  };

  DOM.priorityFilter().onchange=e=>{ state.filters.priority=e.target.value; save(); };
  DOM.statusFilter().onchange=e=>{ state.filters.status=e.target.value; save(); };
  DOM.fromDate().onchange=e=>{ state.filters.from=e.target.value||null; save(); };
  DOM.toDate().onchange=e=>{ state.filters.to=e.target.value||null; save(); };

  DOM.searchInput().addEventListener('input', e=>{ state.filters.query=e.target.value; save(); });

  DOM.newTaskBtn().onclick=()=> openModal();
  DOM.closeModal().onclick=()=> closeModal();
  DOM.createTaskBtn().onclick=()=>{
    const title=$('#m_title').value.trim(); 
    if(!title) return alert('Title is required');
    
    const t={
      id: uid(), 
      title, 
      desc: $('#m_desc').value.trim(), 
      project: $('#m_project').value.trim()||'Personal', 
      priority: $('#m_priority').value, 
      status: 'todo', 
      due: $('#m_due').value||null, 
      dueTime: $('#m_due_time').value || '23:59',
      startDate: $('#m_due').value || null,
      startTime: $('#m_start_time').value || '09:00',
      deps: [], 
      recurring: 'none', 
      created: Date.now(), 
      completed: null, 
      pomodoro: {
        work: 25,
        break: 5,
        phase: 'work',
        remaining: 25*60, 
        running: false
      } 
    };
    
    state.tasks.push(t); 
    if(!state.projects.includes(t.project)) state.projects.push(t.project);
    state.selectedTaskId=t.id; 
    closeModal(); 
    save();
  };

  DOM.saveTaskBtn().onclick=()=>{
    const t = state.tasks.find(x=>x.id===state.selectedTaskId); 
    if(!t) return;
    
    t.title=$('#d_title').value.trim(); 
    t.project=$('#d_project').value.trim()||'Personal'; 
    t.priority=$('#d_priority').value; 
    t.status=$('#d_status').value; 
    t.due=$('#d_due').value||null; 
    t.dueTime=$('#d_due_time').value||'23:59';
    t.startDate=$('#d_start').value||null;
    t.startTime=$('#d_start_time').value||'09:00';
    t.desc=$('#d_desc').value; 
    t.recurring=$('#d_recurring').value||'none';
    
    if(!state.projects.includes(t.project)) state.projects.push(t.project);
    save();
  };

  DOM.deleteTaskBtn().onclick=()=>{ 
    if(!state.selectedTaskId) return; 
    if(confirm('Delete this task?')){ 
      state.tasks = state.tasks.filter(t=>t.id!==state.selectedTaskId); 
      state.selectedTaskId=null; 
      save(); 
    } 
  };
  
  DOM.markDoneBtn().onclick=()=>{ 
    const t=state.tasks.find(x=>x.id===state.selectedTaskId); 
    if(!t) return; 
    t.status='done'; 
    t.completed=Date.now(); 
    if(t.recurring && t.recurring!=='none') createNextRecurring(t); 
    save(); 
  };

  // Tabs
  $$('.tab').forEach(tab=> tab.onclick=()=>{
    $$('.tab').forEach(t=>t.classList.remove('active')); 
    tab.classList.add('active');
    
    const which = tab.dataset.tab;
    DOM.kanbanView().style.display = which==='kanban'? 'grid':'none';
    DOM.calendarView().classList.toggle('active', which==='calendar');
    DOM.dashboardView().classList.toggle('hidden', which!=='dashboard');
    
    // If switching to dashboard, make sure to render it
    if (which === 'dashboard') {
      renderDashboard();
    }
  });

  // Theme
  DOM.themeToggle().onclick=()=>{ 
    state.theme = (state.theme==='light'?'dark':'light'); 
    applyTheme();
    save(); 
  };

  // Export / Import
  DOM.exportBtn().onclick=()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); 
    const a=document.createElement('a'); 
    a.href=url; 
    a.download='tasks.json'; 
    a.click(); 
    URL.revokeObjectURL(url);
  };
  
  DOM.importFile().onchange=(e)=>{
    const file=e.target.files[0]; 
    if(!file) return; 
    
    const reader=new FileReader(); 
    reader.onload=()=>{ 
      try{ 
        const obj=JSON.parse(reader.result); 
        if(obj.tasks&&obj.projects){ 
          state=obj; 
          save(); 
        } else {
          alert('Invalid file'); 
        } 
      } catch(err){ 
        alert('Invalid JSON'); 
      } 
    }; 
    
    reader.readAsText(file);
  };

  // Keyboard shortcuts
  document.addEventListener('keydown', (e)=>{
    if(e.key==='/' && document.activeElement!==DOM.searchInput()){ 
      e.preventDefault(); 
      DOM.searchInput().focus(); 
      return; 
    }
    
    if(e.key.toLowerCase()==='n' && !DOM.taskModal().classList.contains('active')){ 
      openModal(); 
    }
    
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='e'){ 
      e.preventDefault(); 
      DOM.exportBtn().click(); 
    }
    
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='i'){ 
      e.preventDefault(); 
      DOM.importFile().click(); 
    }
  });

  // Voice Input (simple English commands)
  DOM.voiceBtn().onclick=()=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; 
    if(!SR) return alert('Speech Recognition not supported');
    
    const rec = new SR(); 
    rec.lang='en-US'; 
    rec.onresult = (ev)=>{ 
      const text = ev.results[0][0].transcript; 
      quickAddFromSpeech(text); 
    };
    
    rec.start();
  };

  // Notifications
  DOM.notifyBtn().onclick=async()=>{
    if(Notification.permission==='granted') return alert('Notifications already allowed');
    
    try{ 
      const p = await Notification.requestPermission(); 
      if(p!=='granted') alert('Permission denied'); 
    } catch(e){ 
      alert('Notifications not supported'); 
    }
  };
  
  setInterval(()=>{
    if(Notification.permission!=='granted') return;
    
    const now = Date.now();
    state.tasks.forEach(t=>{
      if(!t.due || t.status==='done') return;
      
      const due = new Date(t.due).getTime();
      if(due - now < 15*60*1000 && due - now > 0 && !t.notified){
        new Notification('Upcoming task', { body:`${t.title} at ${t.due}`});
        t.notified=true; 
        save();
      }
    });
  }, 60000);

  // Pomodoro
  DOM.p_mode().onchange=e=> setPomodoroPreset(e.target.value);
  DOM.p_start().onclick=()=>{ 
    const t = state.tasks.find(x=>x.id===state.selectedTaskId); 
    if(!t) return; 
    if(t.pomodoro.running) return; 
    t.pomodoro.running=true; 
    save(); 
    pomodoroInterval = setInterval(()=>{ tickPomodoro(); }, 1000); 
  };
  
  DOM.p_pause().onclick=()=>{ 
    const t = state.tasks.find(x=>x.id===state.selectedTaskId); 
    if(!t) return; 
    t.pomodoro.running=false; 
    save(); 
    clearInterval(pomodoroInterval); 
  };
  
  DOM.p_reset().onclick=()=>{ 
    const t = state.tasks.find(x=>x.id===state.selectedTaskId); 
    if(!t) return; 
    t.pomodoro.running=false; 
    t.pomodoro.phase='work'; 
    t.pomodoro.remaining=t.pomodoro.work*60; 
    save(); 
    clearInterval(pomodoroInterval); 
  };
}

function quickAddFromSpeech(text){
  // Simple parse: "Add task Buy milk priority high due tomorrow project Personal"
  const t={
    id: uid(), 
    title: text, 
    desc: '', 
    project: 'Personal', 
    priority: 'Medium', 
    status: 'todo', 
    due: null, 
    dueTime: '23:59',
    startDate: null,
    startTime: '09:00',
    deps: [], 
    recurring: 'none', 
    created: Date.now(), 
    completed: null, 
    pomodoro: {
      work: 25,
      break: 5,
      phase: 'work',
      remaining: 25*60, 
      running: false
    }
  };
  
  const m=text.toLowerCase();
  if(m.includes('priority high')) t.priority='High'; 
  else if(m.includes('priority low')) t.priority='Low';
  
  if(m.includes('tomorrow')) t.due = fmtDate(Date.now()+86400000);
  if(m.includes('today')) t.due = fmtDate(new Date());
  
  const pj = /project\s+(\w+)/i.exec(text); 
  if(pj) t.project=pj[1];
  
  t.title = text.replace(/(priority\s+(high|medium|low)|project\s+\w+|due\s+(today|tomorrow))/ig,'').trim();
  if(!t.title) t.title='Voice Task';
  
  state.tasks.push(t); 
  if(!state.projects.includes(t.project)) state.projects.push(t.project); 
  state.selectedTaskId=t.id; 
  save();
}

// Pomodoro
let pomodoroInterval=null;

function updatePomodoroUI(){
  const t = state.tasks.find(x=>x.id===state.selectedTaskId); 
  const el=DOM.p_timer(); 
  const st=DOM.p_state();
  
  if(!t){ 
    el.textContent='00:00'; 
    st.textContent='Idle'; 
    return; 
  }
  
  const sec = t.pomodoro.remaining; 
  const m=Math.floor(sec/60).toString().padStart(2,'0'); 
  const s=(sec%60).toString().padStart(2,'0'); 
  el.textContent=`${m}:${s}`; 
  st.textContent = t.pomodoro.running? (t.pomodoro.phase==='work'?'Focus':'Break') : 'Paused';
}

function setPomodoroPreset(val){
  const [w,b] = val.split('-').map(Number); 
  const t = state.tasks.find(x=>x.id===state.selectedTaskId); 
  if(!t) return;
  
  t.pomodoro.work=w; 
  t.pomodoro.break=b; 
  if(!t.pomodoro.running){ 
    t.pomodoro.remaining=w*60; 
    t.pomodoro.phase='work'; 
  }
  
  save();
}

function tickPomodoro(){
  const t = state.tasks.find(x=>x.id===state.selectedTaskId); 
  if(!t){ 
    clearInterval(pomodoroInterval); 
    return; 
  }
  
  if(!t.pomodoro.running) return; 
  
  t.pomodoro.remaining--; 
  if(t.pomodoro.remaining<=0){
    if(t.pomodoro.phase==='work'){
      t.pomodoro.phase='break'; 
      t.pomodoro.remaining=t.pomodoro.break*60; 
      notify(`Break time! Finished a focus block for "${t.title}"`); 
    } else { 
      t.pomodoro.phase='work'; 
      t.pomodoro.remaining=t.pomodoro.work*60; 
      notify(`Focus time! Back to work on "${t.title}"`); 
    }
    
    save();
  }
  
  updatePomodoroUI();
}

function notify(msg){ 
  if(Notification.permission==='granted') new Notification(msg); 
}

// Recurring tasks
function createNextRecurring(task){
  const next = new Date(task.due||Date.now());
  
  if(task.recurring==='daily') next.setDate(next.getDate()+1);
  if(task.recurring==='weekly') next.setDate(next.getDate()+7);
  if(task.recurring==='monthly') next.setMonth(next.getMonth()+1);
  
  const t={
    ...task, 
    id: uid(), 
    status: 'todo', 
    completed: null, 
    due: fmtDate(next), 
    created: Date.now()
  }; 
  
  delete t.notified; 
  state.tasks.push(t);
}

// Modal helpers
function openModal(){ 
  DOM.taskModal().classList.add('active'); 
  $('#m_title').focus(); 
}

function closeModal(){ 
  DOM.taskModal().classList.remove('active'); 
  ['m_title','m_project','m_desc','m_due','m_due_time','m_start_time'].forEach(id=> $(`#${id}`).value=''); 
  $('#m_priority').value='Medium'; 
}

// Init
function init(){
  load(); 
  sampleData(); 
  initEvents();
  initDragAndDrop();
  render();
  
  // Select first task by default
  if(state.tasks.length) { 
    state.selectedTaskId = state.tasks[0].id; 
    save(); 
  }
}

// Start the application
init();