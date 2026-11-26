/* Original Django-rendered pages; only persistence/navigation is simulated locally. */
(() => {
  const BASE='/portfolio/tps/system', ROOT=BASE+'/admin/', KEY='tps-system-admin-demo-v1';
  const page=window.TPS_ADMIN_PAGE||{}, params=new URLSearchParams(location.search);
  const clone=x=>JSON.parse(JSON.stringify(x));
  let data, seed;
  const rows=key=>data[key]?.records||[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const listURL=key=>ROOT+key+'/';
  function changeURL(key,id){const r=rows(key).find(r=>String(r.id)===String(id));const template=key==='users/customuser'?'record-'+(r?.role||'user'):'record';return `${ROOT}${key}/${template}/change/?id=${encodeURIComponent(id)}`}
  function save(){localStorage.setItem(KEY,JSON.stringify(data))}
  function toast(message){document.querySelector('.tps-demo-toast')?.remove();const el=document.createElement('div');el.className='tps-demo-toast';el.setAttribute('role','status');el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),6000)}
  function relation(key,id){return rows(key).find(r=>String(r.id)===String(id))}
  function label(key,id){const r=relation(key,id);if(!r)return '—';return r.email||r.plate||r.name||`#${r.id}`}
  const money=n=>'€ '+Number(n||0).toFixed(2);
  const date=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
  function display(r,key){
    if(key==='role_badge')return String(r.role).toUpperCase();
    if(key==='vehicle_plate')return label('vehicles/vehicle',r.vehicle);
    if(key==='amount_display')return money(r.amount);
    if(key==='status_badge')return r.status;
    if(key==='contest_info')return r.contestation_reason?(r.status==='disputed'?'PENDING REVIEW':r.status==='cancelled'?'Accepted':'Rejected'):'—';
    if(key==='__str__')return 'System Configuration';
    if(key==='get_duration')return r.end_time?`${Math.floor((Date.parse(r.end_time)-Date.parse(r.start_time))/3600000)}h`:'Ongoing';
    if(['total_spots','available_spots'].includes(key)){const all=rows('parkings/spot').filter(s=>s.parking===r.id);return key==='total_spots'?all.length:all.filter(s=>!s.is_occupied).length}
    if(['user','officer','issued_by'].includes(key))return label('users/customuser',r[key]);
    if(key==='vehicle')return label('vehicles/vehicle',r.vehicle);
    if(['parking','parking_lot'].includes(key))return label('parkings/parking',r[key]);
    if(/_at$|_time$/.test(key))return date(r[key]);
    if(typeof r[key]==='boolean')return r[key]?'Yes':'No';
    return r[key]??'—';
  }
  function applyRules(){
    const config=rows('vehicles/globalsettings')[0];
    for(const user of rows('users/customuser'))if(user.role==='user'){
      const ids=rows('vehicles/vehicle').filter(v=>v.user===user.id).map(v=>v.id);
      user.violations_count=rows('vehicles/fine').filter(f=>ids.includes(f.vehicle)&&!['paid','cancelled'].includes(f.status)).length;
      user.is_active=user.violations_count<Number(config?.max_violations||3);
    }
  }
  function renderList(){
    const table=document.querySelector('#result_list');if(!table)return;
    const body=table.tBodies[0];if(!body)return;
    const template=body.cloneNode(true);
    let filtered=[...rows(page.model)];
    const q=(params.get('q')||'').toLowerCase();
    if(q)filtered=filtered.filter(r=>Object.keys(r).some(k=>String(display(r,k)).toLowerCase().includes(q)));
    for(const [key,originalValue] of params){
      if(!originalValue||key.startsWith('_')||['q','p','o','all','v'].includes(key))continue;
      const [field,...lookups]=key.split('__'),schema=data[page.model].fields[field];let value=originalValue;
      if(field==='role')value=value==='officer'?'controller':value==='admin'?'superuser':value;
      if(!schema)continue;
      if(schema.type==='BooleanField')value=value==='1'?true:value==='0'?false:value;
      const operation=lookups.at(-1);
      filtered=filtered.filter(r=>{const actual=r[field];if(['gte','gt','lte','lt'].includes(operation)){const a=schema.type==='DateTimeField'?Date.parse(actual):Number(actual),b=schema.type==='DateTimeField'?Date.parse(value):Number(value);return operation==='gte'?a>=b:operation==='gt'?a>b:operation==='lte'?a<=b:a<b}if(operation==='isnull')return(actual==null||actual==='')===(value==='True'||value==='1');return String(actual).toLowerCase()===String(value).toLowerCase()});
    }
    const head=[...table.querySelectorAll('thead th')];
    const order=Number((params.get('o')||'').split('.')[0]);
    if(order){const column=head[Math.abs(order)]?.className.match(/column-([\w_]+)/)?.[1];if(column)filtered.sort((a,b)=>String(display(a,column)).localeCompare(String(display(b,column)),undefined,{numeric:true})*(order<0?-1:1))}
    const size=50,count=filtered.length,totalPages=Math.max(1,Math.ceil(count/size));
    const index=Math.min(totalPages-1,Math.max(0,Number(params.get('p')||0)));
    [...table.tBodies].forEach(b=>b.remove());
    for(const r of filtered.slice(index*size,(index+1)*size)){
      const b=template.cloneNode(true);
      b.querySelectorAll('input[name="_selected_action"]').forEach(i=>{i.value=r.id;i.checked=false;i.setAttribute('aria-label',`Select record ${r.id}`)});
      b.querySelectorAll('[class*="field-"]').forEach(cell=>{
        const field=cell.className.match(/(?:^|\s)field-([\w_]+)/)?.[1];if(!field)return;
        const link=cell.querySelector('a');
        if(link){link.href=changeURL(page.model,r.id);link.textContent=String(display(r,field))}
        else {cell.textContent=String(display(r,field));if(typeof r[field]==='boolean'){cell.style.color=r[field]?'#16a34a':'#9ca3af'}}
      });
      table.append(b);
    }
    const pagination=document.createElement('div');pagination.className='tps-demo-pagination';
    const info=document.createElement('span');info.textContent=`${count} ${data[page.model].title} · Page ${index+1} / ${totalPages}`;
    const prev=document.createElement('button'),next=document.createElement('button');prev.type=next.type='button';prev.textContent='Previous';next.textContent='Next';prev.disabled=index===0;next.disabled=index>=totalPages-1;
    function move(p){const u=new URL(location.href);u.searchParams.set('p',p);location.href=u.href}
    prev.onclick=()=>move(index-1);next.onclick=()=>move(index+1);pagination.append(info,prev,next);table.after(pagination);
    document.querySelectorAll('.paginator').forEach(e=>e.remove());
    document.querySelectorAll('.py-4').forEach(e=>{if(/^\d+\s+[\w /]+$/.test(e.textContent.trim())&&e.textContent.toLowerCase().includes(data[page.model].title.toLowerCase()))e.textContent=`${count} ${data[page.model].title}`});
    const search=document.querySelector('input[name="q"]');if(search)search.value=params.get('q')||'';
  }
  function fillForm(){
    const form=document.getElementById(page.model.split('/')[1]+'_form');if(!form)return;
    const r=page.kind==='change'?relation(page.model,params.get('id')):null;
    if(page.kind==='change'&&!r){toast('This demo record no longer exists.');setTimeout(()=>location.href=listURL(page.model),1200);return}
    if(r){
      const text=label(page.model,r.id);
      document.title=`${text} | Change ${data[page.model].title} | TPS Admin`;
      for(const a of document.querySelectorAll('a[href]')){
        const u=new URL(a.href,location.href),prefix=ROOT+page.model+'/';
        if(u.pathname.startsWith(prefix)&&/^\d+\/(change|delete|history)\/$/.test(u.pathname.slice(prefix.length))){const action=u.pathname.slice(prefix.length).split('/')[1];a.href=prefix+r.id+'/'+action+'/';if(action==='change')a.textContent=text}
      }
    }
    const relations={user:'users/customuser',officer:'users/customuser',issued_by:'users/customuser',vehicle:'vehicles/vehicle',parking:'parkings/parking',parking_lot:'parkings/parking',session:'vehicles/parkingsession'};
    for(const [name,key] of Object.entries(relations)){
      const select=form.querySelector(`select[name="${name}"]`);if(!select)continue;
      const choices=rows(key).filter(x=>!(page.model==='vehicles/vehicle'&&name==='user')||x.role==='user');
      select.innerHTML='<option value="">---------</option>'+choices.map(x=>`<option value="${x.id}">${esc(label(key,x.id))}</option>`).join('');
    }
    for(const element of form.elements){
      const name=element.name;if(!name||name.startsWith('_')||element.type==='hidden'||element.tagName==='BUTTON')continue;
      if(name==='password'){element.value='';continue}
      if(name==='allowed_cities'){element.checked=(r?.allowed_cities||[]).includes(element.value);continue}
      const part=name.match(/^(.+)_(0|1)$/),key=part?part[1]:name;
      const field=data[page.model].fields[key];if(!field)continue;
      let value=r?.[key];
      if(page.kind==='add'){
        value=field.type==='BooleanField'?(name==='is_active'):field.type==='JSONField'?[]:name==='country'?'Italy':name==='role'?params.get('role')||'user':name==='floor'?'0':name==='status'?element.options?.[0]?.value:field.type.includes('DateTime')?new Date().toISOString():'';
        if(name==='role')value=value==='officer'?'controller':value==='admin'?'superuser':value;
      }
      if(part&&value){const d=new Date(value);value=part[2]==='0'?d.toISOString().slice(0,10):d.toTimeString().slice(0,8)}
      if(element.type==='checkbox')element.checked=Boolean(value);
      else if(element.type!=='file')element.value=typeof value==='object'?JSON.stringify(value,null,2):String(value??'');
    }
    // The native admin defines fieldsets by role; role-specific exports preserve those layouts.
    form.querySelectorAll('.readonly').forEach(e=>{if(e.textContent.includes('!'))e.textContent='Demo account · no usable password'});
    if(r)for(const [field,value] of Object.entries({contest_text_display:r.contestation_reason||'—',issued_at:date(r.issued_at),created_at:date(r.created_at),get_duration:display(r,'get_duration')})){const el=form.querySelector(`.field-${field} .readonly`);if(el)el.textContent=value}
    const cities=form.querySelector('#id_allowed_cities');if(cities)for(const city of rows('parkings/city')){if(![...cities.querySelectorAll('input')].some(i=>i.value===city.name)){const label=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.name='allowed_cities';input.value=city.name;label.append(input,document.createTextNode(' '+city.name));cities.append(label)}}
  }
  function readForm(form){
    const old=page.kind==='change'?relation(page.model,params.get('id')):null;
    const r=old?clone(old):{};
    const formData=new FormData(form);
    for(const [name,field] of Object.entries(data[page.model].fields)){
      if(name==='id')continue;
      const controls=[...form.elements].filter(e=>e.name===name);
      if(name==='allowed_cities'){if(controls.length)r[name]=formData.getAll(name);continue}
      if(field.type==='DateTimeField'&&formData.has(name+'_0')){const day=formData.get(name+'_0'),time=formData.get(name+'_1')||'00:00:00';r[name]=day?new Date(day+'T'+time).toISOString():null;continue}
      if(!controls.length)continue;
      let value=formData.get(name);
      if(field.type==='BooleanField')value=controls.some(e=>e.checked);
      else if(field.type==='JSONField'){try{value=JSON.parse(value||'[]')}catch{throw new Error(`${field.label}: enter valid JSON.`)}}
      else if(field.type==='ForeignKey'||/Integer|Float|Decimal/.test(field.type))value=value===''?null:Number(value);
      else if(field.type==='ImageField')value=value?.name||old?.[name]||'';
      r[name]=value;
    }
    if(page.model==='users/customuser'){
      if(rows(page.model).some(x=>x.email===r.email&&x.id!==r.id))throw new Error('A user with this email already exists.');
      if(['manager','controller'].includes(r.role)&&!r.allowed_cities?.length)throw new Error('Assign at least one city to a Manager or Controller.');
      if(r.role==='controller'&&r.allowed_cities.length!==1)throw new Error('A Controller must be assigned to exactly one city.');
      if(!['manager','controller','superuser'].includes(r.role))r.allowed_cities=[];
    }
    if(page.model==='parkings/city'&&rows(page.model).some(x=>x.name===r.name&&x.id!==r.id))throw new Error('This city already exists.');
    if(page.model==='vehicles/vehicle'&&rows(page.model).some(x=>x.plate===r.plate&&x.id!==r.id))throw new Error('This plate already exists.');
    if(page.model==='vehicles/globalsettings'&&(!Number.isInteger(r.max_violations)||r.max_violations<1||!Number.isInteger(r.grace_period_minutes)||r.grace_period_minutes<0))throw new Error('Enter a positive violation limit and a nonnegative grace period.');
    for(const key of ['polygon_coordinates','tariff_config_json'])if(r[key]){try{JSON.parse(r[key])}catch{throw new Error(`${key}: enter valid JSON.`)}}
    if(!r.id)r.id=Math.max(0,...rows(page.model).map(x=>x.id))+1;
    const now=new Date().toISOString();
    for(const [name,field] of Object.entries(data[page.model].fields))if(field.type==='DateTimeField'&&r[name]===undefined)r[name]=now;
    if(page.model==='users/customuser'){r.is_active??=true;r.violations_count??=0}
    return r;
  }
  function removeRecords(key,ids){
    // Demo deletions are local; related records are removed consistently.
    const remove=(k,set)=>data[k].records=data[k].records.filter(r=>!set.includes(r.id));
    if(key==='users/customuser'){const vids=rows('vehicles/vehicle').filter(v=>ids.includes(v.user)).map(v=>v.id);removeRecords('vehicles/vehicle',vids);data['users/shift'].records=rows('users/shift').filter(s=>!ids.includes(s.officer))}
    if(key==='vehicles/vehicle'){data['vehicles/fine'].records=rows('vehicles/fine').filter(f=>!ids.includes(f.vehicle));data['vehicles/parkingsession'].records=rows('vehicles/parkingsession').filter(s=>!ids.includes(s.vehicle))}
    if(key==='parkings/parking'){data['parkings/spot'].records=rows('parkings/spot').filter(s=>!ids.includes(s.parking));rows('vehicles/parkingsession').forEach(s=>{if(ids.includes(s.parking_lot))s.parking_lot=null})}
    remove(key,ids);applyRules();save();
  }
  function renderDashboard(){
    const values=[rows('users/customuser').filter(u=>u.role==='user').length,rows('vehicles/parkingsession').filter(s=>s.is_active).length,money(rows('vehicles/parkingsession').reduce((a,s)=>a+Number(s.total_cost),0)),rows('vehicles/fine').filter(f=>!['paid','cancelled'].includes(f.status)).length];
    document.querySelectorAll('.insight-number').forEach((e,i)=>e.textContent=values[i]);
    const config=rows('vehicles/globalsettings')[0];
    document.querySelectorAll('.insight-sub').forEach((e,i)=>{if(i===3)e.textContent=rows('vehicles/fine').filter(f=>f.status==='disputed').length+' Pending'});
    const subs=document.querySelectorAll('.insight-sub');if(subs[0])subs[0].textContent='+'+rows('users/customuser').filter(u=>u.role==='user'&&u.date_joined?.slice(0,10)===new Date().toISOString().slice(0,10)).length+' Today';
    for(const el of document.querySelectorAll('.rounded-full')){if(el.textContent.includes('Max Violations:'))el.textContent='Max Violations: '+(config?.max_violations||3);if(el.textContent.includes('Grace Period:'))el.textContent='Grace Period: '+(config?.grace_period_minutes??10)+' min'}
    const rules=document.querySelector('.bg-gray-50');if(rules&&config){const heading=rules.querySelector('h4')?.outerHTML||'';rules.innerHTML=heading+(config.violation_config||[]).map(v=>`<div class="flex justify-between text-sm border-b border-gray-200 py-3"><span>${esc(v.name)}</span><b>${money(v.amount)}</b></div>`).join('')}
  }
  const ready=fetch(BASE+'/seed.json').then(r=>{if(!r.ok)throw new Error('Demo data failed to load.');return r.json()}).then(d=>{
    seed=d;try{data=JSON.parse(localStorage.getItem(KEY))||clone(seed);if(!data['users/customuser'])data=clone(seed)}catch{data=clone(seed)}
    const banner=document.createElement('div');banner.className='tps-demo-banner';banner.innerHTML='<span>系统后台演示 · 原 Django / Unfold 界面 · 修改仅保存在本浏览器</span><a href="/portfolio/tps/">返回 TPS</a>';document.body.prepend(banner);
    const reset=document.createElement('button');reset.type='button';reset.textContent='重置';reset.onclick=()=>{if(confirm('Restore the fictional admin demo data?')){localStorage.removeItem(KEY);location.reload()}};banner.append(reset);
    if(page.kind==='list')renderList();
    if(['change','add'].includes(page.kind))fillForm();
    if(page.kind==='dashboard')renderDashboard();
    const message=sessionStorage.getItem('tps-admin-message');if(message){toast(message);sessionStorage.removeItem('tps-admin-message')}
  }).catch(e=>toast(e.message));

  document.addEventListener('htmx:configRequest',e=>{if(String(e.detail.path).includes('/admin/'))e.preventDefault()});
  document.addEventListener('change',e=>{
    if(e.target.id!=='action-toggle'&&e.target.name!=='_selected_action')return;
    const boxes=[...document.querySelectorAll('[name="_selected_action"]')];
    if(e.target.id==='action-toggle')boxes.forEach(i=>i.checked=e.target.checked);
    document.querySelectorAll('.action-counter').forEach(el=>el.textContent=`${boxes.filter(i=>i.checked).length} of ${boxes.length} selected`);
  });
  document.addEventListener('input',e=>{
    if(!data||!['search-input','search-input-command'].includes(e.target.id))return;
    const query=e.target.value.toLowerCase();const target=document.getElementById(e.target.id==='search-input-command'?'command-results':'search-results');if(!target)return;
    target.innerHTML=Object.entries(data).filter(([key,v])=>v.title.toLowerCase().includes(query)||key.includes(query)).map(([key,v])=>`<a class="tps-search-result" href="${listURL(key)}">${esc(v.title)} <small>(${v.records.length})</small></a>`).join('')||'<p class="p-4">No matching sections.</p>';
  });
  document.addEventListener('click',async e=>{
    const a=e.target.closest('a[href]');if(!a)return;const url=new URL(a.href,location.href);
    if(url.origin!==location.origin)return;
    const match=url.pathname.match(/\/admin\/(users|parkings|vehicles)\/([\w]+)\/(\d+)\/(change|delete|history)\//);
    if(match){e.preventDefault();e.stopImmediatePropagation();await ready;const key=match[1]+'/'+match[2],id=Number(match[3]);if(match[4]==='change')location.href=changeURL(key,id);else if(match[4]==='delete'){if(confirm('Delete this fictional record from this browser?')){removeRecords(key,[id]);location.href=listURL(key)}}else toast('History is not recorded by this browser demo.');return}
    if(/\/password\/$/.test(url.pathname)){e.preventDefault();e.stopImmediatePropagation();toast('Demo accounts have no real password. No credentials are changed.');return}
    if(/\/admin\/(logout|password_change|login)\//.test(url.pathname)){e.preventDefault();e.stopImmediatePropagation();toast('You are viewing the fictional admin demo. No sign-in is required.');return}
    // Related-object popup links should use the local full-page form.
    if(a.classList.contains('related-widget-wrapper-link')){e.preventDefault();e.stopImmediatePropagation();location.href=url.pathname;}
  },true);
  document.addEventListener('submit',async e=>{
    const form=e.target;
    e.preventDefault();e.stopImmediatePropagation();await ready;
    if(form.id==='logout-form'){toast('This demo has no server login session.');return}
    if(form.querySelector('input[name="q"]')&&form.method.toLowerCase()==='get'){const u=new URL(location.href);u.search='';new FormData(form).forEach((v,k)=>u.searchParams.set(k,v));location.href=u.href;return}
    if(form.id==='changelist-form'){
      const action=new FormData(form).get('action'),ids=[...form.querySelectorAll('[name="_selected_action"]:checked')].map(i=>Number(i.value));if(!ids.length){toast('Select at least one record.');return}
      if(action==='delete_selected'){if(confirm(`Delete ${ids.length} fictional records from this browser?`)){removeRecords(page.model,ids);location.reload()}}
      else if(String(action).includes('standing')){for(const r of rows(page.model))if(ids.includes(r.id)){const user=page.model==='users/customuser'?r:relation('users/customuser',relation('vehicles/vehicle',r.vehicle)?.user);if(user){user.violations_count=0;user.is_active=true}}save();location.reload()}
      else toast('Choose a supported action.');return;
    }
    if(!page.model||!form.id.endsWith('_form'))return;
    if(!form.reportValidity())return;
    try{
      const record=readForm(form),records=rows(page.model),index=records.findIndex(x=>x.id===record.id);if(index<0)records.push(record);else records[index]=record;
      applyRules();save();sessionStorage.setItem('tps-admin-message','Saved locally in this browser.');
      if(e.submitter?.name==='_continue')location.href=changeURL(page.model,record.id);
      else if(e.submitter?.name==='_addanother')location.href=listURL(page.model)+'add/';
      else location.href=listURL(page.model);
    }catch(error){toast(error.message)}
  },true);
})();
