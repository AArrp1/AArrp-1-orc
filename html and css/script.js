/* script.js — professional, modular, commented
   Features:
   - Live preview rendering
   - Photo upload (base64)
   - Save / Load to localStorage
   - Export / Import JSON
   - Export to PDF (html2canvas + jsPDF)
*/

(() => {
  // elements
  const form = document.getElementById('resumeForm');
  const preview = document.getElementById('preview');
  const photoInput = document.getElementById('photoInput');
  const photoName = document.getElementById('photoName');
  const templateSelect = document.getElementById('template');
  const previewTemplate = document.getElementById('previewTemplate');

  const btnSave = document.getElementById('saveLocal');
  const btnLoad = document.getElementById('loadLocal');
  const btnClear = document.getElementById('clearLocal');
  const btnExportJSON = document.getElementById('exportJSON');
  const btnImportJSON = document.getElementById('importJSON');
  const importFile = document.getElementById('importFile');
  const btnPdf = document.getElementById('pdfBtn');
  const btnFillSample = document.getElementById('fillSample');

  const STORAGE_KEY = 'really_attractive_resume_v1';

  // state to keep photo dataURL
  let state = { photoDataUrl: '' };

  // Helpers
  const el = (id) => document.getElementById(id);
  const escape = (s = '') => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

  // Read form into data object (includes current photo)
  function readForm() {
    const data = {};
    Array.from(form.elements).forEach(elm => {
      if (!elm.name) return;
      if (elm.type === 'select-one' || elm.type === 'textarea' || elm.type === 'text' || elm.type === 'email')
        data[elm.name] = elm.value || '';
    });
    data.photo = state.photoDataUrl || '';
    return data;
  }

  // Fill form from object
  function fillForm(obj = {}) {
    Object.keys(obj).forEach(k => {
      const field = form.elements.namedItem(k);
      if (field) field.value = obj[k];
    });
    state.photoDataUrl = obj.photo || '';
    photoName.textContent = state.photoDataUrl ? 'Photo loaded' : 'No file chosen';
  }

  // Render preview (two templates: modern, classic)
  function renderPreview() {
    const d = readForm();
    const tpl = (d.template || previewTemplate.value || 'modern');
    preview.className = 'preview ' + tpl;

    // parse lines/lists
    const education = (d.education || '').split('\n').map(s => s.trim()).filter(Boolean);
    const experience = (d.experience || '').split('\n').map(s => s.trim()).filter(Boolean);
    const projects = (d.projects || '').split('\n').map(s => s.trim()).filter(Boolean);
    const skills = (d.skills || '').split(',').map(s => s.trim()).filter(Boolean);

    // header
    let html = '<div class="header">';
    if (tpl === 'classic') {
      html += `<div style="display:flex;gap:12px;align-items:center"><img class="photo" src="${d.photo || ''}" onerror="this.style.display='none'"/><div><h2 class="name">${escape(d.full_name || 'Full Name')}</h2><div class="meta">${escape(d.title || '')}</div><div class="meta">${escape(d.contact || '')} ${d.contact && (d.email||d.location) ? ' • ' : ''}${escape(d.email||'')} ${d.email && d.location ? ' • ' : ''}${escape(d.location||'')}</div></div></div>`;
    } else {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;width:100%"><div style="display:flex;gap:12px;align-items:center"><img class="photo" src="${d.photo || ''}" onerror="this.style.display='none'"/><div><h2 class="name">${escape(d.full_name || 'Full Name')}</h2><div class="meta">${escape(d.title || '')}</div></div></div><div style="text-align:right;color:var(--muted);font-size:13px">${escape(d.location||'')}<br/><strong>${escape(d.contact||'')}</strong><br/>${escape(d.email||'')}</div></div>`;
    }
    html += '</div>';

    // summary
    if (d.summary) html += `<div class="section"><h3>Profile</h3><p>${escape(d.summary)}</p></div>`;

    // education
    if (education.length) html += `<div class="section"><h3>Education</h3><ul>${education.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div>`;

    // experience
    if (experience.length) html += `<div class="section"><h3>Experience</h3><ul>${experience.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div>`;

    // projects
    if (projects.length) html += `<div class="section"><h3>Projects</h3><ul>${projects.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div>`;

    // skills
    if (skills.length) html += `<div class="section"><h3>Skills</h3><div class="skills">${skills.map(x => `<span class="chip">${escape(x)}</span>`).join('')}</div></div>`;

    preview.innerHTML = html;
  }

  // Photo handling: read file to dataURL
  function handlePhotoFile(file) {
    if (!file) return Promise.resolve('');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Local storage functions
  function saveLocal() {
    try {
      const d = readForm();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      alert('Saved locally in browser.');
    } catch (e) {
      console.error(e);
      alert('Save failed.');
    }
  }
  function loadLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { alert('No saved data'); return; }
    try {
      const obj = JSON.parse(raw);
      fillForm(obj);
      renderPreview();
      alert('Loaded saved resume.');
    } catch (e) { alert('Load failed'); }
  }
  function clearLocal() {
    if (!confirm('Clear form and remove saved data?')) return;
    form.reset();
    state.photoDataUrl = '';
    photoName.textContent = 'No file chosen';
    localStorage.removeItem(STORAGE_KEY);
    renderPreview();
  }

  // Export / Import JSON
  function exportJSON() {
    const data = readForm();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'resume-data.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function importJSONFile(file) {
    if (!file) return;
    file.text().then(text => {
      try {
        const obj = JSON.parse(text);
        fillForm(obj);
        renderPreview();
        alert('Imported JSON');
      } catch (e) {
        alert('Invalid JSON file');
      }
    });
  }

  // PDF export using html2canvas + jsPDF
  async function exportPDF() {
    renderPreview();
    // ensure preview styled for print
    const originalBg = preview.style.background;
    preview.style.background = '#ffffff';
    try {
      const scale = 2;
      const canvas = await html2canvas(preview, {scale, useCORS:true, scrollY:-window.scrollY});
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jspdf.jsPDF('p','pt','a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      pdf.addImage(imgData, 'PNG', (pageW - imgW)/2, 20, imgW, imgH);
      const name = (form.elements.namedItem('full_name')?.value || 'resume').trim() || 'resume';
      pdf.save(`${name}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF export failed');
    } finally {
      preview.style.background = originalBg;
    }
  }

  // Sample fill
  function fillSample() {
    const sample = {
      full_name: 'Arpit Tigga',
      title: 'Frontend Developer',
      email: 'aarpit@example.com',
      contact: '+91 98765 43210',
      location: 'Dhanbad, Jharkhand, India',
      summary: 'Motivated frontend developer with strong skills in HTML, CSS, JavaScript and responsive design.',
      education: 'BCA — XYZ College — 2024\n12th — ABC School — 2019',
      experience: 'Frontend Intern — Example Co — 2024\nFreelance Developer — 2023',
      projects: 'Resume Builder — Online Resume & CV\nPortfolio — Personal portfolio site',
      skills: 'HTML, CSS, JavaScript, Bootstrap, Git',
      template: 'modern',
      photo: ''
    };
    fillForm(sample);
    renderPreview();
  }

  // Event bindings
  form.addEventListener('input', () => {
    // keep preview template sync
    const sel = form.elements.namedItem('template');
    if (sel) previewTemplate.value = sel.value;
    renderPreview();
  });

  // photo input change
  photoInput.addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    photoName.textContent = f.name;
    try {
      state.photoDataUrl = await handlePhotoFile(f);
      renderPreview();
    } catch (e) {
      console.error(e);
      alert('Photo load failed');
    }
  });

  // preview template selector
  previewTemplate.addEventListener('change', ev => {
    const v = ev.target.value;
    // also update form template value
    if (form.elements.namedItem('template')) form.elements.namedItem('template').value = v;
    renderPreview();
  });

  // buttons
  btnSave.addEventListener('click', saveLocal);
  btnLoad.addEventListener('click', loadLocal);
  btnClear.addEventListener('click', clearLocal);
  btnExportJSON.addEventListener('click', exportJSON);
  btnImportJSON.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => importJSONFile(e.target.files[0]));
  btnPdf.addEventListener('click', exportPDF);
  btnFillSample.addEventListener('click', fillSample);

  // initial load: if saved data exists, load it
  (function init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        fillForm(obj);
      } catch (e) { /* ignore parse errors */ }
    }
    renderPreview();
  })();

})();
