const SUPABASE_URL = 'https://lkqiddfshsatyvbcylhc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2QJ0iXRYQEuMIsyGkGDWdQ_EqRTxRd8';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TYPES = {
  restaurant:{label:'Restaurantes',singular:'Restaurante',icon:'🍽',criteria:['Comida','Ambiente','Servicio','Ubicación','Factor especial']},
  hotel:{label:'Hoteles',singular:'Hotel',icon:'🛏',criteria:['Habitación','Limpieza','Descanso','Servicio','Ubicación','Instalaciones','Desayuno','Factor especial']},
  gelateria:{label:'Heladerías',singular:'Heladería',icon:'🍦',criteria:['Helado','Variedad','Ambiente','Servicio','Ubicación','Factor especial']},
  cafe:{label:'Cafeterías',singular:'Cafetería',icon:'☕',criteria:['Producto','Ambiente','Servicio','Ubicación','Factor especial']},
  bar:{label:'Bares',singular:'Bar',icon:'🍸',criteria:['Producto','Ambiente','Servicio','Ubicación','Factor especial']},
  nature:{label:'Naturaleza',singular:'Naturaleza',icon:'🌿',criteria:['Belleza','Tranquilidad','Accesibilidad','Conservación','Factor especial']},
  experience:{label:'Experiencias',singular:'Experiencia',icon:'🎟',criteria:['Interés','Organización','Servicio o guía','Duración','Ubicación','Factor especial']},
  other:{label:'Otros',singular:'Otro',icon:'✦',criteria:['Calidad','Ambiente','Servicio','Ubicación','Factor especial']}
};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let session=null, profile=null, profiles={}, places=[], activeType='all', currentStep=0, editingId=null;
let ratingOnly = false;
let pendingOnly = false;
let isSavingPlace = false;
let formRatings={juan:{},rosi:{}}, formReviews={juan:{},rosi:{}}, formPhotos=[], newPhotoFiles=[];
const euros=n=>'€'.repeat(Number(n||1));
const escapeHtml=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const personKeyFromName=n=>(n||'').toLowerCase().startsWith('rosi')?'rosi':'juan';
const currentPerson=()=>personKeyFromName(profile?.display_name);
const requiredCriteria=p=>TYPES[p.type]?.criteria||[];
const hasCompletedRating=(p,person)=>requiredCriteria(p).every(c=>Number(p.ratings?.[person]?.[c]?.score)>0);
const hasCompletedReview=(p,person)=>Boolean(p.reviews?.[person]?.priceLevel)&&Boolean(p.reviews?.[person]?.wouldReturn);
const isPendingForCurrentUser=p=>Boolean(session?.user?.id)&&p.createdBy!==session.user.id&&(!hasCompletedRating(p,currentPerson())||!hasCompletedReview(p,currentPerson()));
const pendingPlaces=()=>places.filter(isPendingForCurrentUser);

function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2400)}
function setBusy(on,msg='Cargando…'){ $('#loadingOverlay').classList.toggle('hidden',!on); $('#loadingOverlay span').textContent=msg; }

async function init(){
  const {data:{session:s}}=await sb.auth.getSession();
  if(!s){showAuth();return}
  await enterApp(s);
  sb.auth.onAuthStateChange(async(_e,s2)=>{if(!s2)showAuth();});
}
function showAuth(){session=null;$('#authView').classList.remove('hidden');$('.app-shell').classList.add('hidden');}
async function enterApp(s){
  session=s; setBusy(true,'Preparando vuestra colección…');
  const {data:p,error}=await sb.from('profiles').select('*').eq('id',s.user.id).single();
  if(error){setBusy(false);showToast('No se pudo cargar el perfil');return}
  profile=p; $('#authView').classList.add('hidden'); $('.app-shell').classList.remove('hidden');
  await loadProfiles(); await loadPlaces(); updateProfileUI(); renderAll(); setBusy(false);
}
async function loadProfiles(){
  const {data,error}=await sb.from('profiles').select('id,display_name'); if(error)throw error;
  profiles={}; for(const p of data)profiles[p.id]=personKeyFromName(p.display_name);
}
async function loadPlaces(){
  const {data,error}=await sb.from('places').select('*, ratings(*), place_photos(*), place_reviews(*)').order('visited_at',{ascending:false});
  if(error){showToast(error.message);return}
  places=[];
  for(const row of data){
    const ratings={juan:{},rosi:{}};
    const reviews={juan:{},rosi:{}};
    for(const r of row.ratings||[]){const pk=profiles[r.user_id]||'juan';ratings[pk][r.criterion]={score:r.score,note:r.note||''}}
    for(const r of row.place_reviews||[]){const pk=profiles[r.user_id]||'juan';reviews[pk]={comment:r.comment||'',priceLevel:r.price_level,wouldReturn:r.would_return||''}}
    const photos=[];
    for(const ph of [...(row.place_photos||[])].sort((a,b)=>a.position-b.position)){
      const {data:signed}=await sb.storage.from('place-photos').createSignedUrl(ph.storage_path,3600);
      if(signed?.signedUrl)photos.push({url:signed.signedUrl,path:ph.storage_path,position:ph.position,uploadedBy:ph.uploaded_by,owner:profiles[ph.uploaded_by]||'juan'});
    }
    places.push({id:row.id,name:row.name,type:row.type,city:row.city,country:row.country,date:row.visited_at,mapsUrl:row.maps_url||'',actualPrice:row.actual_price_eur,createdBy:row.created_by,ratings,reviews,photos});
  }
}

function criterionAverage(p,person,c){return p.ratings?.[person]?.[c]?.score||0}
function personAverage(p,person){const s=Object.values(p.ratings?.[person]||{}).map(x=>Number(x.score)).filter(Boolean),price=Number(p.reviews?.[person]?.priceLevel);return s.length?(s.reduce((a,b)=>a+b,0)+(price?6-price:0))/(s.length+(price?1:0)):0}
function displayPriceLevel(p){return Math.max(0,...Object.values(p.reviews||{}).map(r=>Number(r?.priceLevel)||0))}
function returnValues(p){return Object.values(p.reviews||{}).map(r=>r?.wouldReturn).filter(Boolean)}
function jointAverage(p){const v=['juan','rosi'].map(x=>personAverage(p,x)).filter(Boolean);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0}
function jointCriterion(p,c){const v=['juan','rosi'].map(x=>criterionAverage(p,x,c)).filter(Boolean);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0}
function valueScore(p){const q=TYPES[p.type].criteria.map(c=>jointCriterion(p,c)).filter(Boolean),price=displayPriceLevel(p);return q.length&&price?(q.reduce((a,b)=>a+b,0)/q.length)/price:0}

function renderTypeControls(){
  const chips=[{key:'all',label:'Todos'},...Object.entries(TYPES).map(([key,v])=>({key,label:v.label}))];
  $('#typeChips').innerHTML=chips.map(c=>`<button class="chip ${activeType===c.key?'active':''}" data-type="${c.key}">${c.label}</button>`).join('');
  $('#placeTypeSelect').innerHTML=Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v.singular}</option>`).join('');
  $('#rankingType').innerHTML='<option value="all">Todos</option>'+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
}
function cardTemplate(p){const photo=p.photos?.[0]?.url;return `<button class="place-card" data-place-id="${p.id}"><div class="card-image">${photo?`<img src="${photo}" alt="${escapeHtml(p.name)}">`:`<div class="card-placeholder">${TYPES[p.type]?.icon||'✦'}</div>`}<span class="card-badge">${TYPES[p.type]?.singular}</span></div><div class="card-info"><div class="card-title-row"><h3>${escapeHtml(p.name)}</h3><span class="card-score">★ ${jointAverage(p).toFixed(1)}</span></div><p class="card-meta">${escapeHtml(p.city)}, ${escapeHtml(p.country)} · ${euros(displayPriceLevel(p)||1)}</p></div></button>`}
function renderHome(){const q=($('#searchInput').value||'').toLowerCase();const f=places.filter(p=>(activeType==='all'||p.type===activeType)&&[p.name,p.city,p.country].join(' ').toLowerCase().includes(q));$('#collectionTitle').textContent=activeType==='all'?'Todos los lugares':TYPES[activeType].label;$('#placesGrid').innerHTML=f.map(cardTemplate).join('');$('#emptyState').classList.toggle('hidden',f.length>0)}
function populateFilters(){const cv=$('#countryFilter').value, cityv=$('#cityFilter').value;const cs=[...new Set(places.map(p=>p.country))].sort(), cities=[...new Set(places.filter(p=>!cv||p.country===cv).map(p=>p.city))].sort();$('#countryFilter').innerHTML='<option value="">Todos los países</option>'+cs.map(x=>`<option ${x===cv?'selected':''}>${escapeHtml(x)}</option>`).join('');$('#cityFilter').innerHTML='<option value="">Todas las ciudades</option>'+cities.map(x=>`<option ${x===cityv?'selected':''}>${escapeHtml(x)}</option>`).join('')}
function renderExplore(){populateFilters();const q=($('#exploreSearch').value||'').toLowerCase(),c=$('#countryFilter').value,ci=$('#cityFilter').value,pr=$('#priceFilter').value,rt=$('#returnFilter').value;const f=places.filter(p=>(!pendingOnly||isPendingForCurrentUser(p))&&[p.name,p.city,p.country].join(' ').toLowerCase().includes(q)&&(!c||p.country===c)&&(!ci||p.city===ci)&&(!pr||String(displayPriceLevel(p))===pr)&&(!rt||returnValues(p).includes(rt)));const banner=$('#pendingFilterBanner');banner.classList.toggle('hidden',!pendingOnly);$('#pendingFilterCount').textContent=f.length;$('#exploreTitle').textContent=pendingOnly?'Valoraciones pendientes':'Encuentra un recuerdo';$('#exploreGrid').innerHTML=f.map(p=>cardTemplate(p)).join('')||(pendingOnly?'<div class="empty-state"><h3>Estás al día</h3><p>No tienes valoraciones pendientes.</p></div>':'<div class="empty-state"><h3>No hay resultados</h3></div>')}
function rankingOptions(t){const base=[['general','Nota general'],['value','Calidad-precio'],['special','Más especiales'],['price','Más baratos']];const extra=t==='all'?[]:TYPES[t].criteria.map(c=>['criterion:'+c,c]);$('#rankingCriterion').innerHTML=[...base,...extra].map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
function renderRankings(){const t=$('#rankingType').value||'all',c=$('#rankingCriterion').value||'general';let list=places.filter(p=>t==='all'||p.type===t);const fn=c==='general'?jointAverage:c==='value'?valueScore:c==='special'?p=>jointCriterion(p,'Factor especial'):c==='price'?p=>6-displayPriceLevel(p):p=>jointCriterion(p,c.replace('criterion:',''));list=list.map(p=>({p,score:fn(p)})).sort((a,b)=>b.score-a.score).slice(0,10);$('#rankingList').innerHTML=list.map(({p,score},i)=>`<button class="ranking-item" data-place-id="${p.id}"><span class="rank-number">${i+1}</span>${p.photos?.[0]?`<img class="rank-image" src="${p.photos[0].url}">`:'<div class="rank-image"></div>'}<span><span class="rank-title">${escapeHtml(p.name)}</span><span class="rank-meta">${escapeHtml(p.city)}, ${escapeHtml(p.country)}</span></span><span class="rank-score">${c==='price'?euros(displayPriceLevel(p)||1):score.toFixed(2)}</span></button>`).join('')||'<div class="empty-state"><h3>Aún no hay lugares</h3></div>'}
function renderProfile(){const countries=new Set(places.map(p=>p.country)).size;$('#statsGrid').innerHTML=`<div class="stat-card"><strong>${places.length}</strong><span>Lugares</span></div><div class="stat-card"><strong>${countries}</strong><span>Países</span></div><div class="stat-card"><strong>${places.filter(p=>returnValues(p).includes('yes')).length}</strong><span>Volveríamos</span></div>`;$('#recentList').innerHTML=places.slice(0,5).map(p=>`<button class="recent-item" data-place-id="${p.id}"><span>${escapeHtml(p.name)}</span><small>${escapeHtml(p.city)} · ${p.date}</small></button>`).join('')}
function renderPendingBadge(){const count=pendingPlaces().length,badge=$('#pendingBadge');badge.textContent=count>99?'99+':count;badge.classList.toggle('hidden',count===0);badge.setAttribute('aria-label',count===1?'1 valoración pendiente':`${count} valoraciones pendientes`)}
function openPendingRatings(){pendingOnly=true;accountMenu.classList.add('hidden');navigate('explore');renderExplore();window.scrollTo({top:0,behavior:'smooth'})}
function renderAll(){renderTypeControls();renderHome();renderExplore();if(!$('#rankingCriterion').options.length)rankingOptions('all');renderRankings();renderProfile();renderPendingBadge()}
function navigate(v){$$('.view').forEach(x=>x.classList.remove('active'));$('#'+v+'View').classList.add('active');$$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===v));if(v==='rankings')renderRankings();if(v==='profile')renderProfile()}
function updateProfileUI(){const n=profile?.display_name||'Usuario';$('#activeProfileInitial').textContent=n[0].toUpperCase();$('#activeProfileName').textContent=n;renderPendingBadge()}

function openForm(p=null){
  editingId=p?.id||null;
  ratingOnly=Boolean(p&&p.createdBy!==session?.user?.id);
  currentStep=ratingOnly?1:0;
  newPhotoFiles=[];
  formPhotos=p?.photos?[...p.photos]:[];
  formRatings=p?structuredClone(p.ratings):{juan:{},rosi:{}};
  formReviews=p?structuredClone(p.reviews):{juan:{},rosi:{}};
  const f=$('#placeForm'),pk=currentPerson(),myReview=formReviews[pk]||{};
  f.reset();
  f.elements.date.value=p?.date||new Date().toISOString().slice(0,10);
  f.elements.name.value=p?.name||'';
  f.elements.type.value=p?.type||'restaurant';
  f.elements.city.value=p?.city||'';
  f.elements.country.value=p?.country||'';
  f.elements.mapsUrl.value=p?.mapsUrl||'';
  f.elements.actualPrice.value=p?.actualPrice??'';
  f.elements.comment.value=myReview.comment||'';
  setPrice(myReview.priceLevel||3);
  setReturn(myReview.wouldReturn||'maybe');
  $('#formTitle').textContent=ratingOnly?'Añadir mi opinión':p?'Editar lugar':'Añadir lugar';
  $('#formEyebrow').textContent=ratingOnly?'Tu valoración y recuerdos':p?'Editar recuerdo':'Nuevo recuerdo';
  $('#actualPriceField').classList.toggle('hidden',ratingOnly);
  renderPhotos();renderCriteria();updateStep();$('#placeDialog').showModal();
}
function updateStep(){$$('.form-step').forEach((x,i)=>x.classList.toggle('active',i===currentStep));$$('.stepper span').forEach((x,i)=>x.classList.toggle('active',i<=currentStep));$('#prevStep').classList.toggle('hidden',currentStep===0||(ratingOnly&&currentStep===1));$('#nextStep').classList.toggle('hidden',currentStep===3);$('#savePlace').classList.toggle('hidden',currentStep!==3)}
function renderCriteria(){const pk=currentPerson(),data=formRatings[pk]||{},criteria=TYPES[$('#placeTypeSelect').value].criteria;$('.rating-person-toggle').innerHTML=`<button type="button" class="active">${profile.display_name}</button><button type="button" disabled>La otra valoración se añade desde su cuenta</button>`;$('#criteriaContainer').innerHTML=criteria.map(c=>{const d=data[c]||{score:0,note:''};return `<div class="criterion-card"><div class="criterion-head"><strong>${c}</strong><div class="stars" data-criterion="${escapeHtml(c)}">${[1,2,3,4,5].map(n=>`<button type="button" class="star ${n<=d.score?'selected':''}" data-score="${n}">★</button>`).join('')}</div></div><button type="button" class="criterion-note-toggle" data-note-toggle="${escapeHtml(c)}">${d.note?'Editar nota':'+ Añadir nota breve'}</button><input class="criterion-note ${d.note?'visible':''}" data-note="${escapeHtml(c)}" value="${escapeHtml(d.note)}" placeholder="¿Qué os gustó o no os gustó?"></div>`}).join('')}
function setPrice(value) {
  const input = document.querySelector(
    `#pricePicker input[name="priceLevel"][value="${Number(value)}"]`
  );

  if (input) input.checked = true;
}
function setReturn(v){$('#placeForm').elements.wouldReturn.value=v;$$('#returnPicker button').forEach(b=>b.classList.toggle('active',b.dataset.value===v))}
function renderPhotos(){
  $('#photoPreview').innerHTML=[
    ...formPhotos.map((x,i)=>`<div class="preview-item"><img src="${x.url}">${x.uploadedBy===session.user.id?`<button type="button" data-remove-existing="${i}">×</button>`:`<span class="photo-owner">${x.owner==='rosi'?'R':'J'}</span>`}</div>`),
    ...newPhotoFiles.map((x,i)=>`<div class="preview-item"><img src="${x.preview}"><button type="button" data-remove-new="${i}">×</button></div>`)
  ].join('');
  const full=formPhotos.length+newPhotoFiles.length>=3;
  $('#uploadZone').classList.toggle('hidden',full);
}
async function compressImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=1600,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(blob=>{URL.revokeObjectURL(url);resolve(blob)},'image/webp',.82)};img.onerror=reject;img.src=url})}
async function handleFiles(files){const room=3-formPhotos.length-newPhotoFiles.length;for(const file of [...files].slice(0,room)){if(!file.type.startsWith('image/'))continue;const blob=await compressImage(file);newPhotoFiles.push({blob,preview:URL.createObjectURL(blob)})}renderPhotos();if(files.length>room)showToast('Máximo 3 fotos')}

async function submitPlace(e) {
  e.preventDefault();
  if (isSavingPlace) return;
  isSavingPlace = true;
  const saveButton=$('#savePlace'),originalButtonText=saveButton.textContent;
  saveButton.disabled=true;saveButton.textContent='Guardando…';
  const f=new FormData(e.currentTarget),pk=currentPerson();
  setBusy(true,'Guardando lugar…');
  try {
    const original=editingId?places.find(place=>place.id===editingId):null;
    const placeType=ratingOnly?original?.type:f.get('type');
    const missingCriteria=TYPES[placeType].criteria.filter(criterion=>!formRatings[pk]?.[criterion]?.score);
    if(missingCriteria.length){currentStep=2;updateStep();throw new Error('Completa todas las valoraciones antes de guardar')}
    const review={comment:f.get('comment').trim()||null,price_level:Number(f.get('priceLevel')),would_return:f.get('wouldReturn')};
    let id=editingId;
    if(id){
      if(!ratingOnly){
        const payload={name:f.get('name').trim(),type:placeType,city:f.get('city').trim(),country:f.get('country').trim(),visited_at:f.get('date'),maps_url:f.get('mapsUrl').trim()||null,actual_price_eur:f.get('actualPrice')?Number(f.get('actualPrice')):null};
        const {error}=await sb.from('places').update(payload).eq('id',id);if(error)throw error;
      }
    }else{
      const payload={name:f.get('name').trim(),type:placeType,city:f.get('city').trim(),country:f.get('country').trim(),visited_at:f.get('date'),maps_url:f.get('mapsUrl').trim()||null,actual_price_eur:f.get('actualPrice')?Number(f.get('actualPrice')):null,created_by:session.user.id};
      const {data,error}=await sb.from('places').insert(payload).select('id').single();if(error)throw error;id=data.id;
    }
    const {error:reviewError}=await sb.from('place_reviews').upsert({place_id:id,user_id:session.user.id,...review},{onConflict:'place_id,user_id'});if(reviewError)throw reviewError;
    const rows=Object.entries(formRatings[pk]||{}).filter(([,value])=>value.score).map(([criterion,value])=>({place_id:id,user_id:session.user.id,criterion,score:value.score,note:value.note||null}));
    if(rows.length){const {error}=await sb.from('ratings').upsert(rows,{onConflict:'place_id,user_id,criterion'});if(error)throw error}
    if(editingId){
      const keptPaths=new Set(formPhotos.map(photo=>photo.path));
      const removedPhotos=(original?.photos||[]).filter(photo=>photo.uploadedBy===session.user.id&&!keptPaths.has(photo.path));
      if(removedPhotos.length){const removedPaths=removedPhotos.map(photo=>photo.path);const {error:storageError}=await sb.storage.from('place-photos').remove(removedPaths);if(storageError)throw storageError;const {error:metadataError}=await sb.from('place_photos').delete().in('storage_path',removedPaths);if(metadataError)throw metadataError}
    }
    for(let i=0;i<newPhotoFiles.length;i++){
      const position=formPhotos.length+i,path=`${session.user.id}/${id}/${crypto.randomUUID()}.webp`;
      const {error:uploadError}=await sb.storage.from('place-photos').upload(path,newPhotoFiles[i].blob,{contentType:'image/webp'});if(uploadError)throw uploadError;
      const {error:metadataError}=await sb.from('place_photos').insert({place_id:id,storage_path:path,position,uploaded_by:session.user.id});if(metadataError)throw metadataError;
    }
    $('#placeDialog').close();await loadPlaces();renderAll();showToast(ratingOnly?'Opinión guardada':editingId?'Lugar actualizado':'Lugar guardado');
  }catch(error){console.error(error);showToast(error.message||'No se pudo guardar')}
  finally{isSavingPlace=false;saveButton.disabled=false;saveButton.textContent=originalButtonText;setBusy(false)}
}

function openDetail(id){
  const p=places.find(x=>x.id===id);if(!p)return;
  const gallery=p.photos.length?`<div class="detail-gallery ${p.photos.length===1?'single':''}">${p.photos.map(x=>`<img src="${x.url}">`).join('')}</div>`:`<div class="detail-gallery single"><div class="card-placeholder">${TYPES[p.type].icon}</div></div>`;
  const criteria=TYPES[p.type].criteria,labels={yes:'sí',maybe:'quizá',no:'no'},price=displayPriceLevel(p);
  const returns=['juan','rosi'].map(person=>`${person==='juan'?'Juan':'Rosi'} ${p.reviews?.[person]?.wouldReturn?labels[p.reviews[person].wouldReturn]:'pendiente'}`).join(' · ');
  const comments=['juan','rosi'].filter(person=>p.reviews?.[person]?.comment).map(person=>`<div class="review-comment"><strong>${person==='juan'?'Juan':'Rosi'}</strong><p>${escapeHtml(p.reviews[person].comment)}</p></div>`).join('')||'<p class="muted-review">Aún no hay comentarios.</p>';
  const canDelete=p.createdBy===session.user.id;
  $('#detailContent').innerHTML=`${gallery}<div class="detail-body"><div class="detail-kicker">${TYPES[p.type].singular} · ${new Date(p.date+'T12:00').toLocaleDateString('es-ES')}</div><div class="detail-title-row"><div><h2>${escapeHtml(p.name)}</h2><p class="card-meta">${escapeHtml(p.city)}, ${escapeHtml(p.country)}</p></div><div class="big-score">★ ${jointAverage(p).toFixed(2)}</div></div><div class="joint-opinion"><p><strong>Precio percibido:</strong> ${price?euros(price):'Pendiente'}</p><p><strong>Volverían:</strong> ${returns}</p><div class="joint-comments"><strong>Comentarios</strong>${comments}</div></div><div class="person-scores"><div class="person-score"><span>Conjunta</span><strong>${jointAverage(p).toFixed(2)}</strong></div><div class="person-score"><span>Juan</span><strong>${personAverage(p,'juan').toFixed(2)}</strong></div><div class="person-score"><span>Rosi</span><strong>${personAverage(p,'rosi').toFixed(2)}</strong></div></div><div class="detail-criteria">${criteria.map(c=>`<details class="detail-criterion"><summary><span>${c}</span><strong>★ ${jointCriterion(p,c).toFixed(1)}</strong></summary><div class="detail-criterion-content"><div><strong>Juan · ${criterionAverage(p,'juan',c)||'—'}</strong><br>${escapeHtml(p.ratings.juan[c]?.note||'Sin nota')}</div><div><strong>Rosi · ${criterionAverage(p,'rosi',c)||'—'}</strong><br>${escapeHtml(p.ratings.rosi[c]?.note||'Sin nota')}</div></div></details>`).join('')}</div><div class="detail-actions">${p.mapsUrl?`<a class="secondary-btn" href="${p.mapsUrl}" target="_blank">Abrir en Maps</a>`:''}<button class="secondary-btn" data-edit-place="${p.id}">${canDelete?'Editar':'Añadir/editar mi opinión'}</button>${canDelete?`<button class="danger-btn" data-delete-place="${p.id}">Eliminar</button>`:''}</div></div>`;
  $('#detailDialog').showModal();
}
async function deletePlace(id){if(!confirm('¿Eliminar este lugar?'))return;setBusy(true,'Eliminando…');const p=places.find(x=>x.id===id);if(p?.photos.length)await sb.storage.from('place-photos').remove(p.photos.map(x=>x.path));const {error}=await sb.from('places').delete().eq('id',id);setBusy(false);if(error)return showToast(error.message);$('#detailDialog').close();await loadPlaces();renderAll();showToast('Lugar eliminado')}

$('#authForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);$('#authError').textContent='';const {data,error}=await sb.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error){$('#authError').textContent='Correo o contraseña incorrectos';return}await enterApp(data.session)});
async function logout(){await sb.auth.signOut();showAuth()}
$('#logoutBtn').addEventListener('click',logout);
$('#pendingLogoutBtn').addEventListener('click',logout);
document.addEventListener('click',e=>{const nav=e.target.closest('[data-nav]');if(nav)navigate(nav.dataset.nav);if(e.target.closest('[data-action="add-place"]'))openForm();const card=e.target.closest('[data-place-id]');if(card)openDetail(card.dataset.placeId);const chip=e.target.closest('[data-type]');if(chip){activeType=chip.dataset.type;renderTypeControls();renderHome()}const close=e.target.closest('[data-close]');if(close)document.getElementById(close.dataset.close).close();const star=e.target.closest('.star');if(star){const c=star.parentElement.dataset.criterion,pk=currentPerson();formRatings[pk][c]=formRatings[pk][c]||{score:0,note:''};formRatings[pk][c].score=Number(star.dataset.score);renderCriteria()}const nt=e.target.closest('[data-note-toggle]');if(nt)$(`[data-note="${CSS.escape(nt.dataset.noteToggle)}"]`).classList.toggle('visible');const rt=e.target.closest('#returnPicker [data-value]');if(rt)setReturn(rt.dataset.value);const re=e.target.closest('[data-remove-existing]');if(re){formPhotos.splice(Number(re.dataset.removeExisting),1);renderPhotos()}const rn=e.target.closest('[data-remove-new]');if(rn){newPhotoFiles.splice(Number(rn.dataset.removeNew),1);renderPhotos()}const ed=e.target.closest('[data-edit-place]');if(ed){$('#detailDialog').close();openForm(places.find(p=>p.id===ed.dataset.editPlace))}const del=e.target.closest('[data-delete-place]');if(del)deletePlace(del.dataset.deletePlace)});
document.addEventListener('input',e=>{if(e.target.matches('[data-note]')){const pk=currentPerson(),c=e.target.dataset.note;formRatings[pk][c]=formRatings[pk][c]||{score:0,note:''};formRatings[pk][c].note=e.target.value}});
$('#searchToggle').addEventListener('click',()=>{$('#searchWrap').classList.toggle('hidden');$('#searchInput').focus()});
$('#pendingBadge').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openPendingRatings()});
$('#clearPendingFilter').addEventListener('click',()=>{pendingOnly=false;renderExplore()});$('#searchInput').addEventListener('input',renderHome);['exploreSearch','countryFilter','cityFilter','priceFilter','returnFilter'].forEach(id=>$('#'+id).addEventListener('input',renderExplore));$('#clearFilters').addEventListener('click',()=>{['exploreSearch','countryFilter','cityFilter','priceFilter','returnFilter'].forEach(id=>$('#'+id).value='');renderExplore()});$('#rankingType').addEventListener('change',()=>{rankingOptions($('#rankingType').value);renderRankings()});$('#rankingCriterion').addEventListener('change',renderRankings);const accountWrap = $('.account-wrap');
const profileToggle = $('#profileToggle');
const accountMenu = $('#accountMenu');

profileToggle.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  if (pendingPlaces().length > 0) {
    openPendingRatings();
    return;
  }
  accountMenu.classList.toggle('hidden');
});

accountMenu.addEventListener('click', event => {
  event.stopPropagation();
});

document.addEventListener('click', event => {
  if (!accountWrap.contains(event.target)) {
    accountMenu.classList.add('hidden');
  }
});

$('#placeTypeSelect').addEventListener('change',renderCriteria);$('#nextStep').addEventListener('click',()=>{if(currentStep===0){for(const n of ['name','date','city','country'])if(!$('#placeForm').elements[n].value.trim())return showToast('Completa los datos principales')}currentStep=Math.min(3,currentStep+1);updateStep()});$('#prevStep').addEventListener('click',()=>{currentStep=Math.max(ratingOnly?1:0,currentStep-1);updateStep()});$('#placeForm').addEventListener('submit',submitPlace);$('#choosePhotos').addEventListener('click',()=>$('#photoInput').click());$('#photoInput').addEventListener('change',e=>handleFiles(e.target.files));$('#uploadZone').addEventListener('dragover',e=>e.preventDefault());$('#uploadZone').addEventListener('drop',e=>{e.preventDefault();handleFiles(e.dataTransfer.files)});
init();
