const TYPES = {
  restaurant: { label: 'Restaurantes', singular: 'Restaurante', icon: '🍽', criteria: ['Comida','Ambiente','Servicio','Ubicación','Factor especial'] },
  hotel: { label: 'Hoteles', singular: 'Hotel', icon: '🛏', criteria: ['Habitación','Limpieza','Descanso','Servicio','Ubicación','Instalaciones','Desayuno','Factor especial'] },
  gelateria: { label: 'Heladerías', singular: 'Heladería', icon: '🍦', criteria: ['Helado','Variedad','Ambiente','Servicio','Ubicación','Factor especial'] },
  cafe: { label: 'Cafeterías', singular: 'Cafetería', icon: '☕', criteria: ['Producto','Ambiente','Servicio','Ubicación','Factor especial'] },
  bar: { label: 'Bares', singular: 'Bar', icon: '🍸', criteria: ['Producto','Ambiente','Servicio','Ubicación','Factor especial'] },
  nature: { label: 'Naturaleza', singular: 'Naturaleza', icon: '🌿', criteria: ['Belleza','Tranquilidad','Accesibilidad','Conservación','Factor especial'] },
  experience: { label: 'Experiencias', singular: 'Experiencia', icon: '🎟', criteria: ['Interés','Organización','Servicio o guía','Duración','Ubicación','Factor especial'] },
  other: { label: 'Otros', singular: 'Otro', icon: '✦', criteria: ['Calidad','Ambiente','Servicio','Ubicación','Factor especial'] }
};
const STORAGE_KEY = 'posti-nostri-places-v1';
const PROFILE_KEY = 'posti-nostri-profile';
let activeType = 'all';
let activeProfile = localStorage.getItem(PROFILE_KEY) || 'juan';
let places = loadPlaces();
let currentStep = 0;
let currentPerson = 'juan';
let formPhotos = [];
let editingId = null;
let formRatings = { juan: {}, rosi: {} };

function samplePlaces() {
  const img = (seed) => `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1000&q=80`;
  return [
    { id: crypto.randomUUID(), name:'Civico 90', type:'restaurant', city:'Sabaudia', country:'Italia', date:'2026-06-27', mapsUrl:'', photos:[img('1414235077428-338989a2e8c0')], priceLevel:3, actualPrice:72, wouldReturn:'yes', comment:'Una cena tranquila, producto muy cuidado y una sensación auténtica.', ratings:{juan:{Comida:{score:5,note:'Pescado fresco y muy bien tratado.'},Ambiente:{score:4,note:'Terraza agradable.'},Servicio:{score:5,note:'Muy cercanos y atentos.'},Ubicación:{score:4,note:'Buen punto para cenar en Sabaudia.'},'Factor especial':{score:4,note:'Se sintió local y nada turístico.'}},rosi:{Comida:{score:4,note:'Muy rico.'},Ambiente:{score:5,note:'Me encantó la atmósfera.'},Servicio:{score:5,note:'Encantadores.'},Ubicación:{score:4,note:''},'Factor especial':{score:4,note:''}}}},
    { id: crypto.randomUUID(), name:'Rimessa Roscioli', type:'restaurant', city:'Roma', country:'Italia', date:'2026-05-30', mapsUrl:'', photos:[img('1552566626-52f8b828add9')], priceLevel:4, actualPrice:145, wouldReturn:'yes', comment:'Una experiencia gastronómica completa y muy romana.', ratings:{juan:{Comida:{score:5,note:'Producto y vinos excelentes.'},Ambiente:{score:4,note:'Íntimo y elegante.'},Servicio:{score:5,note:'Explicaciones impecables.'},Ubicación:{score:5,note:'En pleno centro de Roma.'},'Factor especial':{score:5,note:'Cena muy memorable.'}},rosi:{Comida:{score:5,note:''},Ambiente:{score:5,note:''},Servicio:{score:4,note:''},Ubicación:{score:5,note:''},'Factor especial':{score:5,note:''}}}},
    { id: crypto.randomUUID(), name:'Spiaggia della Bufalara', type:'nature', city:'Sabaudia', country:'Italia', date:'2026-06-28', mapsUrl:'', photos:[img('1507525428034-b723cf961d3e')], priceLevel:1, actualPrice:0, wouldReturn:'yes', comment:'Playa amplia, natural y con mucha paz.', ratings:{juan:{Belleza:{score:5,note:'Dunas y mar abierto.'},Tranquilidad:{score:5,note:'Muy poco ruido.'},Accesibilidad:{score:4,note:'Fácil con coche.'},Conservación:{score:4,note:'Bien mantenida.'},'Factor especial':{score:5,note:'Sensación de libertad.'}},rosi:{Belleza:{score:5,note:''},Tranquilidad:{score:4,note:''},Accesibilidad:{score:4,note:''},Conservación:{score:4,note:''},'Factor especial':{score:5,note:''}}}}
  ];
}
function loadPlaces(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { try { return JSON.parse(saved); } catch {} }
  const initial = samplePlaces(); localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); return initial;
}
function savePlaces(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(places)); }
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const euros = n => '€'.repeat(Number(n || 1));
const returnLabel = v => ({yes:'Sí', maybe:'Quizá', no:'No'})[v] || 'Quizá';
function criterionAverage(place, person, criterion){ return place.ratings?.[person]?.[criterion]?.score || 0; }
function personAverage(place, person){
  const scores = Object.values(place.ratings?.[person] || {}).map(v=>Number(v.score)).filter(Boolean);
  const priceScore = 6 - Number(place.priceLevel || 3);
  return scores.length ? (scores.reduce((a,b)=>a+b,0)+priceScore)/(scores.length+1) : 0;
}
function jointAverage(place){
  const vals = ['juan','rosi'].map(p=>personAverage(place,p)).filter(Boolean);
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
}
function jointCriterion(place, criterion){
  const vals = ['juan','rosi'].map(p=>criterionAverage(place,p,criterion)).filter(Boolean);
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
}
function valueScore(place){
  const criteria = TYPES[place.type]?.criteria || [];
  const quality = criteria.map(c=>jointCriterion(place,c)).filter(Boolean);
  const avg = quality.length ? quality.reduce((a,b)=>a+b,0)/quality.length : 0;
  return avg / Number(place.priceLevel || 1);
}
function renderTypeControls(){
  const chips = [{key:'all', label:'Todos'}, ...Object.entries(TYPES).map(([key,v])=>({key,label:v.label}))];
  $('#typeChips').innerHTML = chips.map(c=>`<button class="chip ${activeType===c.key?'active':''}" data-type="${c.key}">${c.label}</button>`).join('');
  $('#placeTypeSelect').innerHTML = Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v.singular}</option>`).join('');
  $('#rankingType').innerHTML = `<option value="all">Todos</option>` + Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
}
function cardTemplate(place){
  const image = place.photos?.[0] ? `<img src="${place.photos[0]}" alt="${place.name}">` : `<div class="card-placeholder">${TYPES[place.type]?.icon || '✦'}</div>`;
  return `<button class="place-card" data-place-id="${place.id}">
    <div class="card-image">${image}<span class="card-badge">${TYPES[place.type]?.singular || 'Lugar'}</span></div>
    <div class="card-info"><div class="card-title-row"><h3>${escapeHtml(place.name)}</h3><span class="card-score">★ ${jointAverage(place).toFixed(1)}</span></div>
    <p class="card-meta">${escapeHtml(place.city)}, ${escapeHtml(place.country)} · ${euros(place.priceLevel)}</p></div>
  </button>`;
}
function renderHome(){
  const search = ($('#searchInput').value || '').toLowerCase();
  const filtered = places.filter(p => (activeType==='all' || p.type===activeType) && [p.name,p.city,p.country].join(' ').toLowerCase().includes(search));
  $('#collectionTitle').textContent = activeType==='all' ? 'Todos los lugares' : TYPES[activeType].label;
  $('#placesGrid').innerHTML = filtered.map(cardTemplate).join('');
  $('#emptyState').classList.toggle('hidden', filtered.length>0);
}
function renderExplore(){
  populateLocationFilters();
  const q = ($('#exploreSearch').value||'').toLowerCase();
  const country=$('#countryFilter').value, city=$('#cityFilter').value, price=$('#priceFilter').value, ret=$('#returnFilter').value;
  const filtered=places.filter(p=>[p.name,p.city,p.country].join(' ').toLowerCase().includes(q)&&(!country||p.country===country)&&(!city||p.city===city)&&(!price||String(p.priceLevel)===price)&&(!ret||p.wouldReturn===ret));
  $('#exploreGrid').innerHTML=filtered.map(cardTemplate).join('') || '<div class="empty-state"><h3>No hay resultados</h3><p>Prueba con otros filtros.</p></div>';
}
function populateLocationFilters(){
  const countryVal=$('#countryFilter').value, cityVal=$('#cityFilter').value;
  const countries=[...new Set(places.map(p=>p.country))].sort(); const cities=[...new Set(places.filter(p=>!countryVal||p.country===countryVal).map(p=>p.city))].sort();
  $('#countryFilter').innerHTML='<option value="">Todos los países</option>'+countries.map(v=>`<option ${v===countryVal?'selected':''}>${escapeHtml(v)}</option>`).join('');
  $('#cityFilter').innerHTML='<option value="">Todas las ciudades</option>'+cities.map(v=>`<option ${v===cityVal?'selected':''}>${escapeHtml(v)}</option>`).join('');
}
function rankingOptions(type){
  const base=[['general','Nota general'],['value','Calidad-precio'],['special','Más especiales'],['price','Más baratos']];
  const criteria = type==='all' ? [] : TYPES[type].criteria.map(c=>['criterion:'+c,c]);
  $('#rankingCriterion').innerHTML=[...base,...criteria].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
}
function renderRankings(){
  const type=$('#rankingType').value||'all'; const criterion=$('#rankingCriterion').value||'general';
  let list=places.filter(p=>type==='all'||p.type===type);
  const scoreFn = criterion==='general' ? jointAverage : criterion==='value' ? valueScore : criterion==='special' ? p=>jointCriterion(p,'Factor especial') : criterion==='price' ? p=>6-p.priceLevel : p=>jointCriterion(p,criterion.replace('criterion:',''));
  list=list.map(p=>({p,score:scoreFn(p)})).sort((a,b)=>b.score-a.score).slice(0,10);
  $('#rankingList').innerHTML=list.map(({p,score},i)=>`<button class="ranking-item" data-place-id="${p.id}"><span class="rank-number">${i+1}</span>${p.photos?.[0]?`<img class="rank-image" src="${p.photos[0]}" alt="">`:`<div class="rank-image"></div>`}<span><span class="rank-title">${escapeHtml(p.name)}</span><span class="rank-meta">${escapeHtml(p.city)}, ${escapeHtml(p.country)} · ${TYPES[p.type].singular}</span></span><span class="rank-score">${criterion==='price'?euros(p.priceLevel):score.toFixed(2)}</span></button>`).join('') || '<div class="empty-state"><h3>Sin datos todavía</h3></div>';
}
function renderProfile(){
  const countries=new Set(places.map(p=>p.country)).size;
  const avg=places.length?places.reduce((s,p)=>s+jointAverage(p),0)/places.length:0;
  const best=[...places].sort((a,b)=>jointAverage(b)-jointAverage(a))[0];
  $('#statsGrid').innerHTML=[['Lugares',places.length],['Países',countries],['Nota media',avg.toFixed(1)],['Mejor valorado',best?best.name:'—']].map(([l,v])=>`<div class="stat-card"><strong>${escapeHtml(String(v))}</strong><span>${l}</span></div>`).join('');
  $('#recentList').innerHTML=[...places].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(p=>`<button class="recent-item" data-place-id="${p.id}">${p.photos?.[0]?`<img src="${p.photos[0]}" alt="">`:`<div class="rank-image"></div>`}<span><strong>${escapeHtml(p.name)}</strong><small>${new Date(p.date+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</small></span></button>`).join('');
}
function renderAll(){ renderTypeControls(); renderHome(); renderExplore(); if(!$('#rankingCriterion').options.length) rankingOptions($('#rankingType').value||'all'); renderRankings(); renderProfile(); updateProfileUI(); }
function navigate(view){
  $$('.view').forEach(v=>v.classList.remove('active')); $(`#${view}View`).classList.add('active');
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
  if(view==='explore') renderExplore(); if(view==='rankings') renderRankings(); if(view==='profile') renderProfile(); window.scrollTo({top:0,behavior:'smooth'});
}
function updateProfileUI(){ $('#activeProfileInitial').textContent=activeProfile==='juan'?'J':'R'; $('#activeProfileName').textContent=activeProfile==='juan'?'Juan':'Rosi'; }
function openForm(place=null){
  editingId=place?.id||null; currentStep=0; currentPerson=activeProfile; formPhotos=place?.photos?[...place.photos]:[]; formRatings=place?.ratings?JSON.parse(JSON.stringify(place.ratings)):{juan:{},rosi:{}};
  $('#placeForm').reset(); $('#formEyebrow').textContent=place?'Editar recuerdo':'Nuevo recuerdo'; $('#formTitle').textContent=place?'Editar lugar':'Añadir lugar';
  const f=$('#placeForm').elements;
  if(place){ ['name','type','date','city','country','mapsUrl','actualPrice','comment','wouldReturn','priceLevel'].forEach(k=>{if(f[k]) f[k].value=place[k]??''}); }
  else { f.date.value=new Date().toISOString().slice(0,10); f.priceLevel.value='3'; f.wouldReturn.value='maybe'; }
  setPricePicker(Number(f.priceLevel.value||3)); setReturnPicker(f.wouldReturn.value||'maybe'); setPerson(currentPerson); renderPhotoPreview(); renderCriteria(); updateFormStep(); $('#placeDialog').showModal();
}
function updateFormStep(){
  $$('.form-step').forEach((el,i)=>el.classList.toggle('active',i===currentStep)); $$('.stepper span').forEach((el,i)=>el.classList.toggle('active',i<=currentStep));
  $('#prevStep').classList.toggle('hidden',currentStep===0); $('#nextStep').classList.toggle('hidden',currentStep===3); $('#savePlace').classList.toggle('hidden',currentStep!==3);
}
function validateCurrentStep(){
  if(currentStep===0){ for(const name of ['name','type','date','city','country']){ const el=$('#placeForm').elements[name]; if(!el.value.trim()){ el.focus(); showToast('Completa los datos principales'); return false; } } }
  return true;
}
function renderCriteria(){
  const type=$('#placeTypeSelect').value; const criteria=TYPES[type]?.criteria||[]; const data=formRatings[currentPerson]||{};
  $('#criteriaContainer').innerHTML=criteria.map(c=>{const score=data[c]?.score||0,note=data[c]?.note||''; return `<div class="criterion-card"><div class="criterion-head"><strong>${c}</strong><div class="stars" data-criterion="${c}">${[1,2,3,4,5].map(n=>`<button type="button" class="star ${n<=score?'selected':''}" data-score="${n}">★</button>`).join('')}</div></div><button type="button" class="criterion-note-toggle" data-note-toggle="${c}">${note?'Editar nota':'+ Añadir nota breve'}</button><input class="criterion-note ${note?'visible':''}" data-note="${c}" value="${escapeAttr(note)}" placeholder="¿Qué os gustó o no os gustó?" /></div>`}).join('');
}
function setPerson(person){ currentPerson=person; $$('.rating-person-toggle button').forEach(b=>b.classList.toggle('active',b.dataset.person===person)); renderCriteria(); }
function setPricePicker(value){ $('#placeForm').elements.priceLevel.value=String(value); $('#pricePicker').innerHTML=[1,2,3,4,5].map(n=>`<button type="button" data-price="${n}" class="${n===value?'active':''}">${euros(n)}</button>`).join(''); }
function setReturnPicker(value){ $('#placeForm').elements.wouldReturn.value=value; $$('#returnPicker button').forEach(b=>b.classList.toggle('active',b.dataset.value===value)); }
function renderPhotoPreview(){ $('#photoPreview').innerHTML=formPhotos.map((src,i)=>`<div class="preview-item"><img src="${src}" alt="Vista previa"><button type="button" data-remove-photo="${i}">×</button></div>`).join(''); }
async function handleFiles(files){
  const allowed=[...files].slice(0,3-formPhotos.length); for(const file of allowed){ if(!file.type.startsWith('image/')) continue; formPhotos.push(await compressImage(file)); renderPhotoPreview(); }
  if(files.length>allowed.length) showToast('Máximo 3 fotos');
}
function compressImage(file){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>{ const img=new Image(); img.onload=()=>{ const max=1400, scale=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale); c.getContext('2d').drawImage(img,0,0,c.width,c.height); resolve(c.toDataURL('image/jpeg',.78)); }; img.onerror=reject; img.src=reader.result; }; reader.onerror=reject; reader.readAsDataURL(file); }); }
function submitPlace(e){
  e.preventDefault(); const f=new FormData($('#placeForm')); const place={ id:editingId||crypto.randomUUID(), name:f.get('name').trim(), type:f.get('type'), date:f.get('date'), city:f.get('city').trim(), country:f.get('country').trim(), mapsUrl:f.get('mapsUrl').trim(), photos:formPhotos, priceLevel:Number(f.get('priceLevel')), actualPrice:f.get('actualPrice')?Number(f.get('actualPrice')):null, comment:f.get('comment').trim(), wouldReturn:f.get('wouldReturn'), ratings:formRatings };
  if(editingId) places=places.map(p=>p.id===editingId?place:p); else places.unshift(place); savePlaces(); $('#placeDialog').close(); renderAll(); showToast(editingId?'Lugar actualizado':'Lugar guardado');
}
function openDetail(id){
  const p=places.find(x=>x.id===id); if(!p) return;
  const gallery=p.photos?.length?`<div class="detail-gallery ${p.photos.length===1?'single':''}">${p.photos.map(src=>`<img src="${src}" alt="${escapeAttr(p.name)}">`).join('')}</div>`:`<div class="detail-gallery single"><div class="card-placeholder">${TYPES[p.type].icon}</div></div>`;
  const criteria=TYPES[p.type].criteria;
  $('#detailContent').innerHTML=`${gallery}<div class="detail-body"><div class="detail-kicker"><span>${TYPES[p.type].singular}</span><span>·</span><span>${new Date(p.date+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</span></div><div class="detail-title-row"><div><h2>${escapeHtml(p.name)}</h2><p class="card-meta">${escapeHtml(p.city)}, ${escapeHtml(p.country)}</p></div><div class="big-score">★ ${jointAverage(p).toFixed(2)}</div></div><div class="detail-summary"><span class="summary-pill">${euros(p.priceLevel)}</span><span class="summary-pill">Volveríamos: ${returnLabel(p.wouldReturn)}</span>${p.actualPrice!==null?`<span class="summary-pill">${p.actualPrice.toFixed(0)} € aprox.</span>`:''}</div><div class="person-scores"><div class="person-score"><span>Conjunta</span><strong>${jointAverage(p).toFixed(2)}</strong></div><div class="person-score"><span>Juan</span><strong>${personAverage(p,'juan').toFixed(2)}</strong></div><div class="person-score"><span>Rosi</span><strong>${personAverage(p,'rosi').toFixed(2)}</strong></div></div><div class="detail-criteria">${criteria.map(c=>`<details class="detail-criterion"><summary><span>${c}</span><strong>★ ${jointCriterion(p,c).toFixed(1)}</strong></summary><div class="detail-criterion-content"><div><strong>Juan · ${criterionAverage(p,'juan',c)||'—'}</strong><br>${escapeHtml(p.ratings?.juan?.[c]?.note||'Sin nota')}</div><div><strong>Rosi · ${criterionAverage(p,'rosi',c)||'—'}</strong><br>${escapeHtml(p.ratings?.rosi?.[c]?.note||'Sin nota')}</div></div></details>`).join('')}</div>${p.comment?`<p class="detail-comment">${escapeHtml(p.comment)}</p>`:''}<div class="detail-actions">${p.mapsUrl?`<a class="secondary-btn" href="${escapeAttr(p.mapsUrl)}" target="_blank" rel="noopener">Abrir en Maps</a>`:''}<button class="secondary-btn" data-edit-place="${p.id}">Editar</button><button class="danger-btn" data-delete-place="${p.id}">Eliminar</button></div></div>`;
  $('#detailDialog').showModal();
}
function showToast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),2200); }
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(v=''){ return escapeHtml(v); }

document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-nav]'); if(nav) navigate(nav.dataset.nav);
  if(e.target.closest('[data-action="add-place"]')) openForm();
  const card=e.target.closest('[data-place-id]'); if(card) openDetail(card.dataset.placeId);
  const chip=e.target.closest('[data-type]'); if(chip){ activeType=chip.dataset.type; renderTypeControls(); renderHome(); }
  const close=e.target.closest('[data-close]'); if(close) document.getElementById(close.dataset.close).close();
  const person=e.target.closest('[data-person]'); if(person) setPerson(person.dataset.person);
  const star=e.target.closest('.star'); if(star){ const c=star.parentElement.dataset.criterion; formRatings[currentPerson][c]=formRatings[currentPerson][c]||{score:0,note:''}; formRatings[currentPerson][c].score=Number(star.dataset.score); renderCriteria(); }
  const toggle=e.target.closest('[data-note-toggle]'); if(toggle) $(`[data-note="${CSS.escape(toggle.dataset.noteToggle)}"]`).classList.toggle('visible');
  const pr=e.target.closest('[data-price]'); if(pr) setPricePicker(Number(pr.dataset.price));
  const ret=e.target.closest('#returnPicker [data-value]'); if(ret) setReturnPicker(ret.dataset.value);
  const rem=e.target.closest('[data-remove-photo]'); if(rem){formPhotos.splice(Number(rem.dataset.removePhoto),1);renderPhotoPreview();}
  const edit=e.target.closest('[data-edit-place]'); if(edit){ const p=places.find(x=>x.id===edit.dataset.editPlace); $('#detailDialog').close(); openForm(p); }
  const del=e.target.closest('[data-delete-place]'); if(del&&confirm('¿Eliminar este lugar?')){places=places.filter(p=>p.id!==del.dataset.deletePlace);savePlaces();$('#detailDialog').close();renderAll();showToast('Lugar eliminado');}
});
document.addEventListener('input',e=>{ if(e.target.matches('[data-note]')){ const c=e.target.dataset.note; formRatings[currentPerson][c]=formRatings[currentPerson][c]||{score:0,note:''}; formRatings[currentPerson][c].note=e.target.value; } });
$('#searchToggle').addEventListener('click',()=>{ $('#searchWrap').classList.toggle('hidden'); if(!$('#searchWrap').classList.contains('hidden')) $('#searchInput').focus(); });
$('#searchInput').addEventListener('input',renderHome);
['exploreSearch','countryFilter','cityFilter','priceFilter','returnFilter'].forEach(id=>$('#'+id).addEventListener('input',renderExplore));
$('#clearFilters').addEventListener('click',()=>{['exploreSearch','countryFilter','cityFilter','priceFilter','returnFilter'].forEach(id=>$('#'+id).value='');renderExplore();});
$('#rankingType').addEventListener('change',()=>{rankingOptions($('#rankingType').value);renderRankings();});
$('#rankingCriterion').addEventListener('change',renderRankings);
$('#profileToggle').addEventListener('click',()=>{activeProfile=activeProfile==='juan'?'rosi':'juan';localStorage.setItem(PROFILE_KEY,activeProfile);updateProfileUI();showToast(`Perfil activo: ${activeProfile==='juan'?'Juan':'Rosi'}`);});
$('#placeTypeSelect').addEventListener('change',renderCriteria);
$('#nextStep').addEventListener('click',()=>{if(validateCurrentStep()){currentStep=Math.min(3,currentStep+1);updateFormStep();}});
$('#prevStep').addEventListener('click',()=>{currentStep=Math.max(0,currentStep-1);updateFormStep();});
$('#placeForm').addEventListener('submit',submitPlace);
$('#choosePhotos').addEventListener('click',()=>$('#photoInput').click());
$('#photoInput').addEventListener('change',e=>handleFiles(e.target.files));
['dragenter','dragover'].forEach(ev=>$('#uploadZone').addEventListener(ev,e=>{e.preventDefault();$('#uploadZone').classList.add('dragover');}));
['dragleave','drop'].forEach(ev=>$('#uploadZone').addEventListener(ev,e=>{e.preventDefault();$('#uploadZone').classList.remove('dragover');}));
$('#uploadZone').addEventListener('drop',e=>handleFiles(e.dataTransfer.files));
renderAll();
