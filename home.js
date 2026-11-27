// The star and revealed trail share one continuous curve in document space.
(() => {
  const star = document.querySelector('.travel-star');
  const shape = star.querySelector('path');
  const docks = [...document.querySelectorAll('.star-dock')];
  const scenes = [...document.querySelectorAll('.project-scene')];
  const index = [...document.querySelectorAll('.project-index a')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const trail = document.createElementNS(ns, 'svg');
  trail.classList.add('star-trail');
  trail.setAttribute('aria-hidden', 'true');
  trail.innerHTML = `<defs><linearGradient id="trail-yellow" gradientUnits="userSpaceOnUse" x1="0" x2="0"><stop offset="0" stop-color="#fff2a6" stop-opacity=".24"/><stop offset=".65" stop-color="#ffe46c" stop-opacity=".72"/><stop offset="1" stop-color="#ffc928"/></linearGradient></defs><path class="trail-halo"/><path class="trail-line"/>`;
  document.body.prepend(trail);
  const line = trail.querySelector('.trail-line');
  const halo = trail.querySelector('.trail-halo');
  const gradient = trail.querySelector('linearGradient');
  const ruler = document.createElementNS(ns, 'path');
  let stops = [], lengths = [], total = 0, frame = 0, lastTime = 0;
  let easedScroll = scrollY;
  const lerp = (a,b,t) => a+(b-a)*t;
  const clamp = (n,min=0,max=1) => Math.max(min,Math.min(max,n));

  function measure() {
    stops = docks.map((dock,i) => {
      const r = dock.getBoundingClientRect();
      const scene = i ? scenes[i-1].getBoundingClientRect() : null;
      return {x:r.left,y:r.top+scrollY,
        at:i?scene.top+scrollY+scene.height/2-innerHeight/2:0,
        size:Number(dock.dataset.size)*(innerWidth<761?.78:1),
        turn:Number(dock.dataset.turn),pinch:Number(dock.dataset.pinch)};
    });
    let d=`M${stops[0].x},${stops[0].y}`;
    lengths=[0];total=0;
    // Catmull–Rom tangents keep the path smooth across each project waypoint.
    for(let i=0;i<stops.length-1;i++) {
      const before=stops[Math.max(0,i-1)],a=stops[i],b=stops[i+1],after=stops[Math.min(stops.length-1,i+2)];
      const c1={x:clamp(a.x+(b.x-before.x)/6,24,innerWidth-24),y:a.y+(b.y-before.y)/6};
      const c2={x:clamp(b.x-(after.x-a.x)/6,24,innerWidth-24),y:b.y-(after.y-a.y)/6};
      const curve=`C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
      ruler.setAttribute('d',`M${a.x},${a.y}${curve}`);
      total+=ruler.getTotalLength();lengths.push(total);d+=curve;
    }
    trail.setAttribute('viewBox',`0 0 ${document.documentElement.clientWidth} ${document.body.offsetHeight}`);
    trail.setAttribute('width','100%');
    trail.setAttribute('height',document.body.offsetHeight);
    [line,halo].forEach(p=>{p.setAttribute('d',d);p.style.strokeDasharray=`0 ${total+1}`});
    easedScroll=scrollY;
    requestDraw();
  }

  function draw(time) {
    frame=0;
    if(!stops.length)return;
    const dt=lastTime?Math.min(64,time-lastTime):16;
    lastTime=time;
    // A short, time-based catch-up absorbs wheel steps without locking native scroll.
    easedScroll=clamp(easedScroll,scrollY-innerHeight*.28,scrollY+innerHeight*.28);
    easedScroll=lerp(easedScroll,scrollY,1-Math.exp(-dt/105));
    if(Math.abs(easedScroll-scrollY)<.15)easedScroll=scrollY;
    let n=0;
    while(n<stops.length-2 && easedScroll>stops[n+1].at)n++;
    const a=stops[n],b=stops[n+1];
    const t=clamp((easedScroll-a.at)/(b.at-a.at));
    const distance=lerp(lengths[n],lengths[n+1],t);
    const point=line.getPointAtLength(distance);
    const arrival=Math.exp(-Math.pow((t-.98)/.22,2));
    const size=lerp(a.size,b.size,t)*(1+.22*Math.sin(t*Math.PI)+.12*arrival);
    const pinch=lerp(a.pinch,b.pinch,t);
    if(reduced.matches) {
      const s=stops[0];
      star.style.transform=`translate(${s.x-60}px,${s.y-60}px) scale(${s.size/120})`;
      shape.setAttribute('d','M60 0Q66 54 120 60Q66 66 60 120Q54 66 0 60Q54 54 60 0Z');
    } else {
      shape.setAttribute('d',`M60 0Q${60+pinch} ${60-pinch} 120 60Q${60+pinch} ${60+pinch} 60 120Q${60-pinch} ${60+pinch} 0 60Q${60-pinch} ${60-pinch} 60 0Z`);
      star.style.transform=`translate(${point.x-60}px,${point.y-scrollY-60}px) rotate(${lerp(a.turn,b.turn,t)}deg) scale(${size/120})`;
    }
    star.style.opacity='1';
    // Only the travelled portion is painted; there is no visible future path.
    [line,halo].forEach(p=>{p.style.strokeDasharray=`${distance} ${total+1}`});
    gradient.setAttribute('y1',Math.max(stops[0].y,point.y-innerHeight*1.5));
    gradient.setAttribute('y2',Math.max(stops[0].y+1,point.y));
    let active=-1;
    scenes.forEach((scene,i)=>{
      const r=scene.getBoundingClientRect();
      const focus=Math.exp(-Math.pow((easedScroll-stops[i+1].at)/(innerHeight*.38),2));
      scene.style.setProperty('--arrival',reduced.matches?0:focus.toFixed(3));
      scene.classList.toggle('star-arrived',focus>.45);
      if(r.top<innerHeight*.6 && r.bottom>innerHeight*.4)active=i;
      const drift=clamp((r.top+r.height/2-innerHeight/2)*.06,-32,32);
      scene.style.setProperty('--drift',reduced.matches?'0px':`${drift}px`);
    });
    index.forEach((link,i)=>{if(i===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
    if(!reduced.matches && Math.abs(easedScroll-scrollY)>.15)requestDraw();
  }
  function requestDraw(){if(!frame)frame=requestAnimationFrame(draw)}
  addEventListener('scroll',requestDraw,{passive:true});
  addEventListener('resize',measure);
  addEventListener('load',measure);
  reduced.addEventListener('change',measure);
  measure();
})();
