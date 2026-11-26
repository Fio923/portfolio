/* Local transport adapter for the unmodified Flutter applications. */
(() => {
  const nativeFetch = window.fetch.bind(window), KEY='tps-original-flutter-v2';
  const iso=n=>new Date(n).toISOString();
  let seed;
  const ready=nativeFetch(new URL('../data.json',document.baseURI)).then(r=>r.json()).then(d=>{seed=d});
  const read=()=>{try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version===2)return s}catch{}return initial()};
  const initial=()=>{
    const now=Date.now(),s={version:2,parkings:structuredClone(seed.parkings),spots:structuredClone(seed.spots),vehicles:[{id:1,user_id:2,plate:'DEMO001',name:'City car',is_favorite:true},{id:2,user_id:2,plate:'DEMO002',name:'Weekend car',is_favorite:false},{id:3,user_id:2,plate:'DEMO003',name:'Family car',is_favorite:false},{id:4,user_id:1,plate:'DEMO004',name:'Demo EV',is_favorite:false}],sessions:[],fines:[],cards:[{id:1,card_number:'4242',is_default:true}],shifts:[],profile:{id:1,first_name:'Demo',last_name:'Driver',email:'demo@tps.example',is_active:true}};
    for(const [i,ago,duration] of [[0,20,80],[1,130,60],[2,65,60]]){
      const p=s.parkings[0],spot=s.spots.find(x=>x.parking===p.id&&!x.is_occupied);if(spot)spot.is_occupied=true;
      s.sessions.push({id:100+i,user_id:2,vehicle_id:i+1,parking_lot_id:p.id,spot_id:spot?.id,start_time:iso(now-ago*60000),planned_end_time:iso(now+(duration-ago)*60000),end_time:null,is_active:true,duration_purchased_minutes:duration,prepaid_cost:cost(p,duration),total_cost:null,grace_period_minutes:10});
    }
    return s;
  };
  const persist=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const cost=(p,m)=>{const t=p.tariff??JSON.parse(p.tariff_config_json),h=m/60;let c=t.type==='FIXED_DAILY'?h/24*t.daily_rate:h*t.day_base_rate;if(t.type==='HOURLY_VARIABLE'){const r=(t.flex_rules||[]).find(r=>h>r.from_hours&&h<=r.to_hours);if(r)c*=r.multiplier}return Math.round(c*100)/100};
  const status=s=>!s.is_active?'ended':Date.now()<Date.parse(s.planned_end_time)?'active':Date.now()<Date.parse(s.planned_end_time)+s.grace_period_minutes*60000?'grace_period':'expired';
  const parking=(s,p)=>{const spots=s.spots.filter(x=>x.parking===p.id),sessions=s.sessions.filter(x=>x.parking_lot_id===p.id);return {...p,rate_per_hour:p.rate??2.5,tariff_config_json:JSON.stringify(p.tariff),marker_latitude:p.latitude,marker_longitude:p.longitude,polygon_coords:p.polygon_coordinates||[],entrances:[],total_spots:spots.length,occupied_spots:spots.filter(x=>x.is_occupied).length,today_entries:sessions.length,today_revenue:sessions.filter(x=>!x.is_active).reduce((n,x)=>n+(x.total_cost??x.prepaid_cost),0),grace_period_minutes:p.grace??10}};
  const session=(s,x)=>({...x,vehicle:s.vehicles.find(v=>v.id===x.vehicle_id),parking_lot:parking(s,s.parkings.find(p=>p.id===x.parking_lot_id)),status:status(x),is_expired:status(x)==='expired',is_in_grace_period:status(x)==='grace_period'});
  const ok=(body,code=200)=>({body,code});
  function route(s,path,method,b,q){
    const id=Number(path.split('/')[1]), now=Date.now();
    if(path.startsWith('users/token/')||path==='users/register/')return ok({access:'demo-access-'+(path.includes('controller')?'controller':path.includes('manager')?'manager':'user'),refresh:'demo-refresh',role:path.includes('controller')?'controller':path.includes('manager')?'manager':'user',allowed_cities:['Torino','Roma','Milano'],tokens:{access:'demo-access-user',refresh:'demo-refresh'}},path==='users/register/'?201:200);
    if(path==='users/profile/'){if(method!=='GET'){s.profile.first_name=b.first_name??s.profile.first_name;s.profile.last_name=b.last_name??s.profile.last_name}return ok(s.profile)}
    if(/users\/(password-reset|change-password|delete)/.test(path))return ok({detail:'Demo operation completed. No real account was changed.'});
    if(path==='cities/authorized/'||path==='cities/')return ok([...new Set(s.parkings.map(p=>p.city))].map((name,i)=>{const p=s.parkings.find(p=>p.city===name);return{id:i+1,name,latitude:p.latitude,longitude:p.longitude}}));
    if(path==='parkings/search_map/'||path==='parkings/'){
      if(method==='POST'){const p={...b,id:now,rate:Number(b.rate_per_hour)||2.5,tariff:JSON.parse(b.tariff_config_json||'{}'),grace:10};s.parkings.push(p);return ok(parking(s,p),201)}
      return ok(s.parkings.filter(p=>!q.get('city')||p.city===q.get('city')).map(p=>parking(s,p)));
    }
    const pm=path.match(/^parkings\/(\d+)\/(.*)$/);
    if(pm){const pid=Number(pm[1]),p=s.parkings.find(p=>p.id===pid);if(!p)return ok({detail:'Parking not found'},404);
      if(pm[2]==='spots/')return ok(s.spots.filter(x=>x.parking===pid));
      if(pm[2]==='sessions/')return ok(s.sessions.filter(x=>x.parking_lot_id===pid&&x.is_active).map(x=>session(s,x)));
      if(method==='PUT'||method==='PATCH'){Object.assign(p,b);if(b.tariff_config_json)p.tariff=JSON.parse(b.tariff_config_json);return ok(parking(s,p))}
      if(method==='DELETE'){if(s.sessions.some(x=>x.parking_lot_id===pid&&x.is_active))return ok({detail:'End open sessions before deleting this area'},400);s.parkings=s.parkings.filter(x=>x.id!==pid);s.spots=s.spots.filter(x=>x.parking!==pid);return ok(null,204)}
      return ok(parking(s,p));
    }
    if(path==='spots/'&&method==='POST'){const n=s.spots.filter(x=>x.parking===b.parking).length+1,x={...b,id:now,number:'D'+n};s.spots.push(x);return ok(x,201)}
    if(path.startsWith('spots/')){const x=s.spots.find(x=>x.id===id);if(method==='DELETE'){if(x?.is_occupied)return ok({detail:'Space occupied'},400);s.spots=s.spots.filter(x=>x.id!==id);return ok(null,204)}if(x&&method==='PATCH')Object.assign(x,b);return x?ok(x):ok({detail:'Space not found'},404)}
    if(path==='vehicles/plate-ocr/')return ok({plate:'DEMO002',confidence:.99,source:'local-demo'});
    if(path==='vehicles/'){
      if(method==='POST'){const plate=String(b.plate||'').toUpperCase();if(s.vehicles.some(x=>x.plate===plate))return ok({plate:['Vehicle already exists']},400);const v={...b,plate,id:now,user_id:1};s.vehicles.push(v);return ok(v,201)}return ok(s.vehicles.filter(v=>v.user_id===1));
    }
    if(path.startsWith('vehicles/')){const v=s.vehicles.find(v=>v.id===id);if(method==='DELETE'){if(s.sessions.some(x=>x.vehicle_id===id&&x.is_active))return ok({detail:'End the active session first'},400);s.vehicles=s.vehicles.filter(x=>x.id!==id);return ok(null,204)}if(v){Object.assign(v,b);return ok(v)}return ok({detail:'Vehicle not found'},404)}
    if(path==='sessions/search_by_plate/'){
      const plate=(q.get('plate')||'').toUpperCase(),v=s.vehicles.find(x=>x.plate===plate),x=s.sessions.find(x=>x.vehicle_id===v?.id&&x.is_active),st=x?status(x):v?'no_session':'not_found';
      return ok({status:st,can_issue_ticket:['expired','no_session','not_found'].includes(st),message:{active:'Valid parking session.',grace_period:'Vehicle is within the grace period.',expired:'Parking payment and grace period have expired.',no_session:'No active session for this vehicle.',not_found:'Vehicle not found in demo records.'}[st],session_data:x?session(s,x):null});
    }
    if(path==='sessions/'){
      if(method==='POST'){
        const vid=Number(b.vehicle_id),pid=Number(b.parking_lot_id),minutes=Number(b.duration_purchased_minutes),p=s.parkings.find(x=>x.id===pid),v=s.vehicles.find(x=>x.id===vid);
        if(!p||!v||minutes<=0||!Number.isFinite(minutes))return ok({detail:'Invalid parking or vehicle'},400);
        if(s.sessions.some(x=>x.vehicle_id===vid&&x.is_active))return ok({detail:'A session is already active'},400);
        const spot=s.spots.find(x=>x.parking===pid&&!x.is_occupied);if(!spot)return ok({detail:'No available spaces'},400);spot.is_occupied=true;
        const x={id:now,vehicle_id:vid,parking_lot_id:pid,spot_id:spot.id,start_time:iso(now),planned_end_time:iso(now+minutes*60000),end_time:null,is_active:true,duration_purchased_minutes:minutes,prepaid_cost:Number(b.prepaid_cost)||cost(p,minutes),total_cost:null,grace_period_minutes:p.grace??10};x.user_id=1;s.sessions.unshift(x);return ok(session(s,x),201);
      }
      const active=q.get('active');return ok(s.sessions.filter(x=>x.user_id===1&&(active==null||x.is_active===(active==='true'))).map(x=>session(s,x)));
    }
    if(path.startsWith('sessions/')){const x=s.sessions.find(x=>x.id===id);if(!x)return ok({detail:'Session not found'},404);if(path.endsWith('/end_session/')){x.is_active=false;x.end_time=iso(now);x.total_cost=x.prepaid_cost;const spot=s.spots.find(p=>p.id===x.spot_id);if(spot)spot.is_occupied=false}if(path.includes('extend')){const minutes=Number(b.duration_purchased_minutes||b.additional_minutes||30);x.duration_purchased_minutes+=minutes;x.planned_end_time=iso(Math.max(now,Date.parse(x.planned_end_time))+minutes*60000);x.prepaid_cost+=Number(b.prepaid_cost)||cost(s.parkings.find(p=>p.id===x.parking_lot_id),minutes)}return ok(session(s,x))}
    if(path==='users/payment-cards/'){if(method==='POST'){const x={id:now,card_number:String(b.card_number||'4242').slice(-4),is_default:s.cards.length===0};s.cards.push(x);return ok(x,201)}return ok(s.cards)}
    if(path.startsWith('users/payment-cards/')){const cid=Number(path.split('/')[2]);s.cards=s.cards.filter(x=>x.id!==cid);return ok(null,204)}
    if(path==='users/shifts/current/')return ok({active:s.shifts.some(x=>x.status==='OPEN'),shift:s.shifts.find(x=>x.status==='OPEN')??null});
    if(path==='users/shifts/start/'){let sh=s.shifts.find(x=>x.status==='OPEN');if(!sh){sh={id:now,start_time:iso(now),end_time:null,status:'OPEN'};s.shifts.unshift(sh)}return ok(sh,201)}
    if(path==='users/shifts/end/'){const sh=s.shifts.find(x=>x.status==='OPEN');if(sh){sh.status='CLOSED';sh.end_time=iso(now)}return ok({detail:'Shift ended'})}
    if(path==='users/shifts/history/')return ok({shifts:s.shifts});
    if(path==='users/shifts/active-officers/'){const sh=s.shifts.find(x=>x.status==='OPEN');return ok({active_officers:sh?[{id:1,email:'officer@tps.example',first_name:'Demo',last_name:'Officer',role:'controller',shift_id:sh.id,shift_start:sh.start_time,shift_duration_seconds:Math.floor((now-Date.parse(sh.start_time))/1000)}]:[]})}
    if(path==='users/violations/types/')return ok([{id:1,name:'Expired parking session',amount:50},{id:2,name:'No valid parking session',amount:50}]);
    if(path==='users/violations/report/'){
      const plate=String(b.plate||'').toUpperCase(),v=s.vehicles.find(v=>v.plate===plate),x=s.sessions.find(x=>x.vehicle_id===v?.id&&x.is_active);
      if(!s.shifts.some(x=>x.status==='OPEN'))return ok({detail:'Start a shift first'},400);
      if(x&&['active','grace_period'].includes(status(x)))return ok({detail:'Valid sessions cannot be ticketed'},400);
      if(s.fines.some(f=>f.vehicle_plate===plate&&f.status==='unpaid'))return ok({detail:'An unpaid notice already exists'},400);
      const fine={id:now,vehicle_plate:plate,reason:b.reason||'Parking violation',notes:b.notes||'',amount:50,status:'unpaid',issued_at:iso(now)};s.fines.unshift(fine);return ok(fine,201);
    }
    if(path==='users/me/fines/')return ok(s.fines);
    const fm=path.match(/^users\/fines\/(\d+)\/(pay|contest)\/$/);if(fm){const f=s.fines.find(f=>f.id===Number(fm[1]));if(!f)return ok({detail:'Notice not found'},404);if(fm[2]==='pay'){f.status='paid';f.paid_at=iso(now)}else{f.status='disputed';f.contestation_reason=b.reason}return ok(f)}
    return ok({detail:'This operation is not available in the local demo.'},404);
  }
  async function bodyOf(init){const body=init?.body;if(body==null)return{};if(body instanceof FormData)return Object.fromEntries(body);let text=typeof body==='string'?body:body instanceof ArrayBuffer?new TextDecoder().decode(body):ArrayBuffer.isView(body)?new TextDecoder().decode(body):String(body);try{return JSON.parse(text)}catch{}
    const fields={};for(const m of text.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]*?)(?=\r\n--)/g))fields[m[1]]=m[2];return fields;
  }
  window.fetch=async function(input,init){const url=new URL(typeof input==='string'?input:input.url,document.baseURI);if(!url.pathname.startsWith('/api/'))return nativeFetch(input,init);await ready;const s=read();let result;try{result=route(s,url.pathname.slice(5),(init?.method||input.method||'GET').toUpperCase(),await bodyOf(init),url.searchParams);persist(s)}catch(e){console.error('Local TPS adapter:',e);result=ok({detail:e.message},400)}const r=new Response(result.code===204?null:JSON.stringify(result.body),{status:result.code,headers:{'content-type':'application/json; charset=utf-8'}});Object.defineProperty(r,'url',{value:url.href});return r};
  // Device location is a demo input, not the visitor's actual location.
  const position=()=>({coords:{latitude:45.062623,longitude:7.662486,accuracy:10,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()});
  if(navigator.geolocation){navigator.geolocation.getCurrentPosition=(success)=>setTimeout(()=>success(position()),0);navigator.geolocation.watchPosition=(success)=>{setTimeout(()=>success(position()),0);return 1};navigator.geolocation.clearWatch=()=>{}}
  if(navigator.permissions){const query=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=async descriptor=>descriptor.name==='geolocation'?Object.assign(new EventTarget(),{state:'granted',onchange:null}):query(descriptor)}
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data==='tps-reset'){localStorage.removeItem(KEY);location.reload()}});
})();
