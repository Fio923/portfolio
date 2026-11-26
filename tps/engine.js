export const VERSION = 1;
export function calculateCost(tariff, minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) throw new Error('Invalid duration');
  const hours = minutes / 60;
  let cost;
  if (tariff.type === 'FIXED_DAILY') cost = hours / 24 * Number(tariff.daily_rate);
  else {
    let multiplier = 1;
    if (tariff.type === 'HOURLY_VARIABLE') {
      const rule = (tariff.flex_rules || []).find(r => hours > r.from_hours && hours <= r.to_hours);
      multiplier = rule ? Number(rule.multiplier) : 1;
    }
    cost = hours * Number(tariff.day_base_rate) * multiplier;
  }
  return Math.round(cost * 100) / 100;
}
export function statusOf(session, now) {
  if (session.ended) return 'ended';
  if (now < session.end) return 'active';
  if (now < session.end + session.grace * 60000) return 'grace';
  return 'expired';
}
export function newState(data, now = Date.now()) {
  const state = {
    version: VERSION, parkings: structuredClone(data.parkings), spots: structuredClone(data.spots),
    vehicles: [{id:1,plate:'DEMO001',name:'City car'},{id:2,plate:'DEMO002',name:'Weekend car'},{id:3,plate:'DEMO003',name:'Family car'},{id:4,plate:'DEMO004',name:'Demo EV'}],
    sessions: [], violations: [], payments: [], shift: null, shiftHistory: [], offset: 0,
    logs: [{id:now,at:now,text:'Demo loaded from 7 parking areas and 1,280 spaces.'}]
  };
  for (const [i, minutesAgo, duration] of [[0,20,80],[1,130,60],[2,65,60]]) {
    const parking = state.parkings[0];
    const spot = state.spots.find(s=>s.parking===parking.id && !s.is_occupied);
    if (spot) spot.is_occupied = true;
    const start = now - minutesAgo * 60000;
    state.sessions.push({id:100+i,plate:state.vehicles[i].plate,vehicleId:i+1,parkingId:parking.id,spotId:spot?.id,start,end:start+duration*60000,grace:10,ended:false,cost:calculateCost(parking.tariff,duration),minutes:duration,demo:true});
  }
  return state;
}
export function addSession(state, {parkingId, vehicleId, minutes}, now) {
  if (!Number.isInteger(minutes) || minutes < 10 || minutes > 1440) throw new Error('Choose a duration from 10 minutes to 24 hours.');
  const parking=state.parkings.find(p=>p.id===parkingId), vehicle=state.vehicles.find(v=>v.id===vehicleId);
  if (!parking || !vehicle) throw new Error('Select a parking area and vehicle.');
  if(state.sessions.some(s=>s.vehicleId===vehicleId && !s.ended)) throw new Error('This vehicle already has an open session. End it first.');
  const spot=state.spots.find(s=>s.parking===parkingId && !s.is_occupied);
  if(!spot) throw new Error('No spaces available. Please choose another parking area.');
  const session={id:now,parkingId,vehicleId,plate:vehicle.plate,spotId:spot.id,start:now,end:now+minutes*60000,grace:parking.grace,ended:false,cost:calculateCost(parking.tariff,minutes),minutes};
  state.sessions.unshift(session); spot.is_occupied=true;
  state.payments.unshift({id:now,at:now,amount:session.cost,type:'Parking',reference:session.id});
  return session;
}
export function endSession(state,id,now) {
  const s=state.sessions.find(s=>s.id===id);
  if(!s||s.ended)throw new Error('Session is already closed.');
  s.ended=true;s.endedAt=now;
  const spot=state.spots.find(p=>p.id===s.spotId);if(spot)spot.is_occupied=false;
  return s;
}
export function extendSession(state,id,minutes,now) {
  const s=state.sessions.find(s=>s.id===id);
  if(!s||s.ended)throw new Error('Only open sessions can be extended.');
  const p=state.parkings.find(p=>p.id===s.parkingId);
  const newEnd=Math.max(now,s.end)+minutes*60000;
  const totalMinutes=Math.ceil((newEnd-s.start)/60000);
  if(totalMinutes>1440)throw new Error('Maximum session duration is 24 hours.');
  const newCost=calculateCost(p.tariff,totalMinutes), amount=Math.max(0,Math.round((newCost-s.cost)*100)/100);
  s.minutes=totalMinutes;s.end=newEnd;s.cost=newCost;
  state.payments.unshift({id:now,at:now,amount,type:'Extension',reference:id});return amount;
}
export function issueViolation(state,plate,reason,notes,now) {
  if(!state.shift) throw new Error('Start a shift before checking vehicles.');
  plate=plate.trim().toUpperCase();if(!/^[A-Z0-9]{4,10}$/.test(plate))throw new Error('Use a plate with 4–10 letters or digits.');
  const session=state.sessions.find(s=>s.plate===plate&&!s.ended);
  if(session&&['active','grace'].includes(statusOf(session,now))) throw new Error('A valid session or grace period cannot be ticketed.');
  if(state.violations.some(v=>v.plate===plate&&!v.paid))throw new Error('An unpaid notice already exists for this vehicle.');
  const v={id:now,plate,reason,notes,at:now,amount:50,paid:false};state.violations.unshift(v);return v;
}
