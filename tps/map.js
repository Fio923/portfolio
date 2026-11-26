(() => {
const campus=[45.062623,7.662486],id=Number(new URLSearchParams(location.search).get('id')),root=document.getElementById('map'),base=document.getElementById('base'),pins=document.getElementById('pins'),polygons=document.getElementById('polygons');
const names={};fetch('./data.json').then(r=>r.json()).then(d=>{for(const p of d.parkings)names[p.id]=p.name;draw()}).catch(()=>{});
let center=[...campus],zoom=14,markers=[],areas=[],scroll=true,zoomEnabled=true,drag=null,dragged=false;
const send=(type,data={})=>parent.postMessage(JSON.stringify({source:'tps-demo-map',mapId:id,type,...data}),location.origin);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scale=()=>256*2**zoom/360,point=(lat,lng)=>[(lng-center[1])*scale()+root.clientWidth/2,(center[0]-lat)*scale()/Math.cos(center[0]*Math.PI/180)+root.clientHeight/2];
const coordinate=(x,y)=>[center[0]-(y-root.clientHeight/2)*Math.cos(center[0]*Math.PI/180)/scale(),center[1]+(x-root.clientWidth/2)/scale()];
const project=p=>point(p[0],p[1]).join(',');
const path=points=>points.map((p,i)=>(i?'L':'M')+project(p)).join(' ');
const roads=[
 {p:[[45.08,7.655],[45.066,7.661],[45.049,7.668]],name:'Corso Duca degli Abruzzi',label:[45.057,7.665],w:16},
 {p:[[45.08,7.662],[45.067,7.656],[45.049,7.655]],name:'Corso Castelfidardo',label:[45.07,7.657],w:14},
 {p:[[45.074,7.64],[45.069,7.663],[45.061,7.683]],name:'Corso Vittorio Emanuele II',label:[45.0678,7.672],w:19},
 {p:[[45.07,7.674],[45.048,7.682]],name:'Via Paolo Sacchi',label:[45.057,7.6795],w:10},
 {p:[[45.067,7.645],[45.061,7.663],[45.055,7.686]],name:'Corso Einaudi',label:[45.059,7.673],w:13},
 {p:[[45.055,7.64],[45.051,7.664],[45.043,7.69]],name:'Corso Rosselli',label:[45.05,7.673],w:13}
];
function camera(){const sw=coordinate(0,root.clientHeight),ne=coordinate(root.clientWidth,0);send('camera',{lat:center[0],lng:center[1],zoom,bounds:[sw,ne]})}
function draw(){
 const w=root.clientWidth,h=root.clientHeight;for(const s of [base,polygons]){s.setAttribute('viewBox',`0 0 ${w} ${h}`);s.setAttribute('width',w);s.setAttribute('height',h)}
 let out='<rect width="100%" height="100%" fill="#e8ecee"/>';
 // Geographic drawing is intentionally illustrative; locations use real coordinates.
 for(let i=-35;i<36;i++){const d=i*.0015;out+=`<path d="${path([[45.09+d,7.62],[45.045+d,7.73]])}" stroke="#fff" stroke-width="6" fill="none"/><path d="${path([[45.1,7.64+d],[45.015,7.67+d]])}" stroke="#fff" stroke-width="5" fill="none"/>`}
 const river=[[45.09,7.707],[45.075,7.704],[45.062,7.697],[45.051,7.695],[45.033,7.686]];out+=`<path d="${path(river)}" stroke="#b8dce5" stroke-width="45" fill="none"/>`;
 const campusBoundary=[[45.0646,7.6587],[45.065,7.6633],[45.0612,7.6643],[45.0609,7.6602]];
 out+=`<polygon points="${campusBoundary.map(project).join(' ')}" fill="#d3dfd3" stroke="#a8bba8" stroke-width="1"/>`;
 for(let i=0;i<4;i++){const lat=45.0617+i*.00065;out+=`<polygon points="${[[lat,7.66],[lat+.00035,7.66],[lat+.00035,7.6628],[lat,7.6628]].map(project).join(' ')}" fill="#c9c3b8" stroke="#fff" stroke-width="1"/>`}
 for(const r of roads){out+=`<path d="${path(r.p)}" stroke="#ced5da" stroke-width="${r.w+3}" fill="none"/><path d="${path(r.p)}" stroke="#fffdf4" stroke-width="${r.w}" fill="none"/>`;const p=point(...r.label);out+=`<text x="${p[0]}" y="${p[1]}" font-size="11" text-anchor="middle" fill="#6e7984" paint-order="stroke" stroke="#eef1f1" stroke-width="3">${r.name}</text>`}
 const cp=point(...campus);out+=`<circle cx="${cp[0]}" cy="${cp[1]}" r="8" fill="#517b9d" stroke="white" stroke-width="3"/><text x="${cp[0]}" y="${cp[1]-31}" text-anchor="middle" fill="#40596b" font-size="13" font-weight="bold" paint-order="stroke" stroke="#eef2ec" stroke-width="4">Politecnico di Torino</text><text x="${cp[0]}" y="${cp[1]-15}" text-anchor="middle" fill="#627587" font-size="10">Campus principale</text>`;
 base.innerHTML=out;
 polygons.innerHTML=areas.map(a=>`<polygon data-id="${esc(a.id)}" points="${a.points.map(project).join(' ')}" fill="${color(a.fill,.28)}" stroke="${color(a.stroke,1)}" stroke-width="${a.width||2}"/>`).join('');
 const placed=[];
 pins.innerHTML=markers.map(m=>{const p=point(m.lat,m.lng),vertex=m.draggable;if(!vertex){while(placed.some(q=>Math.abs(q[0]-p[0])<48&&Math.abs(q[1]-p[1])<48))p[0]+=50;placed.push(p)}return `<button class="pin ${vertex?'vertex':''}" style="left:${p[0]}px;top:${p[1]}px" data-id="${esc(m.id)}" aria-label="${esc(m.title||names[m.id]||m.id)}" title="${esc(m.title||names[m.id]||m.id)}">${vertex?'':`<img src="${icon(m)}" alt="" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><span class="fallback" hidden>P</span>`}</button>`}).join('');
}
function color(n,a){n=Number(n)||0xff395aab;return`rgba(${n>>>16&255},${n>>>8&255},${n&255},${a})`}
function icon(m){function find(v){if(Array.isArray(v)){if(v.length>100&&v.every(x=>typeof x==='number'))return v;for(const a of v){const r=find(a);if(r)return r}}else if(v&&typeof v==='object')for(const a of Object.values(v)){const r=find(a);if(r)return r}return null}const bytes=find(m.icon);if(bytes){let binary='';for(const n of bytes)binary+=String.fromCharCode(n);return'data:image/png;base64,'+btoa(binary)}return /user|current|car/i.test(m.id)?'user/assets/assets/images/car_location_marker.png':'user/assets/assets/images/parking_marker.png'}
root.addEventListener('pointerdown',e=>{if(e.target.closest('.tools'))return;const button=e.target.closest('.pin'),m=button&&markers.find(m=>m.id===button.dataset.id);drag={x:e.clientX,y:e.clientY,center:[...center],marker:m?.draggable?m:null,targetId:button?.dataset.id,polygonId:e.target.closest('polygon[data-id]')?.dataset.id};dragged=false;root.setPointerCapture(e.pointerId);if(drag.marker)send('dragstart',{id:m.id,lat:m.lat,lng:m.lng})});
root.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)dragged=true;if(drag.marker){const p=coordinate(e.clientX,e.clientY);drag.marker.lat=p[0];drag.marker.lng=p[1];send('drag',{id:drag.marker.id,lat:p[0],lng:p[1]});draw()}else if(scroll&&dragged){center=[drag.center[0]+dy*Math.cos(drag.center[0]*Math.PI/180)/scale(),drag.center[1]-dx/scale()];draw()}});
root.addEventListener('pointerup',e=>{if(!drag)return;const m=drag.marker;if(m)send('dragend',{id:m.id,lat:m.lat,lng:m.lng});else if(dragged)camera();else{const target=document.elementFromPoint(e.clientX,e.clientY),pin=target?.closest('.pin'),poly=target?.closest('polygon[data-id]');if(drag.targetId)send('marker',{id:drag.targetId});else if(drag.polygonId)send('polygon',{id:drag.polygonId});else if(pin)send('marker',{id:pin.dataset.id});else if(poly)send('polygon',{id:poly.dataset.id});else{const p=coordinate(e.clientX,e.clientY);send('tap',{lat:p[0],lng:p[1]})}}drag=null});
root.addEventListener('wheel',e=>{if(!zoomEnabled)return;e.preventDefault();zoom=Math.max(5,Math.min(19,zoom+(e.deltaY<0?.5:-.5)));draw();camera()},{passive:false});
root.addEventListener('contextmenu',e=>{e.preventDefault();const p=coordinate(e.clientX,e.clientY);send('longpress',{lat:p[0],lng:p[1]})});
document.getElementById('plus').onclick=()=>{zoom=Math.min(19,zoom+1);draw();camera()};document.getElementById('minus').onclick=()=>{zoom=Math.max(5,zoom-1);draw();camera()};document.getElementById('home').onclick=()=>{center=[...campus];zoom=14;draw();camera()};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;let d;try{d=JSON.parse(e.data)}catch{return}if(d.type==='objects'){markers=d.markers;areas=d.polygons;draw()}if(d.type==='options'){if(d.scroll!=null)scroll=d.scroll;if(d.zoom!=null)zoomEnabled=d.zoom}if(d.type==='camera'){const u=d.update;if(u[0]==='newCameraPosition'){center=u[1].target;zoom=u[1].zoom}else if(u[0]==='newLatLng'){center=u[1]}else if(u[0]==='newLatLngZoom'){center=u[1];zoom=u[2]}else if(u[0]==='newLatLngBounds'){const [sw,ne]=u[1];center=[(sw[0]+ne[0])/2,(sw[1]+ne[1])/2];const span=Math.max(ne[1]-sw[1],(ne[0]-sw[0])/Math.cos(center[0]*Math.PI/180));zoom=Math.max(5,Math.min(17,Math.log2((Math.min(root.clientWidth,root.clientHeight)-80)*360/(256*Math.max(span,.002)))))}else if(u[0]==='zoomTo')zoom=u[1];else if(u[0]==='zoomIn')zoom++;else if(u[0]==='zoomOut')zoom--;draw();camera()}});
new ResizeObserver(()=>{draw();camera()}).observe(root);draw();send('ready');camera();
})();
