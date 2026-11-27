// The star and revealed trail share one continuous curve in document space.
(() => {
  const star = document.querySelector('.travel-star');
  const shape = star.querySelector('path');
  const docks = [...document.querySelectorAll('.star-dock')];
  const scenes = [...document.querySelectorAll('.project-scene')];
  const sceneMotion = window.createPortfolioScenes(scenes, star);
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
  const safeMask=document.createElementNS(ns,'mask');
  safeMask.id='trail-image-exclusion';safeMask.setAttribute('maskUnits','userSpaceOnUse');
  const white=document.createElementNS(ns,'rect');white.setAttribute('fill','white');safeMask.append(white);
  // The playhead intentionally crosses the digital preview; binary artwork stays outside.
  const exclusions=[...document.querySelectorAll('.scene-visual .visual-link,.care-moment,.scene-caption,.about-label')].filter(element=>!(element.matches('.visual-link')&&element.closest('.digital-scene'))).map(element=>{
    const rect=document.createElementNS(ns,'rect');rect.setAttribute('fill','black');rect.setAttribute('rx','20');safeMask.append(rect);return {element,rect};
  });
  trail.querySelector('defs').append(safeMask);
  [line,halo].forEach(p=>p.setAttribute('mask','url(#trail-image-exclusion)'));
  const ruler = document.createElementNS(ns, 'path');
  let stops = [], route = [], lengths = [], total = 0, frame = 0, lastTime = 0;
  let easedScroll = scrollY;
  const lerp = (a,b,t) => a+(b-a)*t;
  const clamp = (n,min=0,max=1) => Math.max(min,Math.min(max,n));

  function measure() {
    const anchors = sceneMotion.measure();
    stops = docks.map((dock,i) => {
      const r = dock.getBoundingClientRect();
      const scene = i ? scenes[i-1].getBoundingClientRect() : null;
      return {x:i?anchors[i-1].x:r.left,y:i?anchors[i-1].y:r.top+scrollY,
        at:i?scene.top+scrollY+scene.height/2-innerHeight/2:0,
        size:Number(dock.dataset.size)*(innerWidth<761?.78:1),
        turn:Number(dock.dataset.turn),pinch:Number(dock.dataset.pinch)};
    });
    const card=document.querySelector('.digital-window').getBoundingClientRect();
    const signature=document.querySelector('.signature-slot').getBoundingClientRect();
    const pageWidth=document.documentElement.clientWidth,edge=innerWidth<761?48:70;
    const x=v=>clamp(v,edge,pageWidth-edge);
    const digital=stops[3],top=card.top+scrollY;
    const finish={x:signature.left+signature.width/2,y:signature.top+scrollY+signature.height/2,
      at:Math.min(document.body.offsetHeight-innerHeight,Math.max(digital.at+innerHeight*.64,signature.top+scrollY-innerHeight*.47)),size:36,turn:360,kind:'signature'};
    const exitAt=Math.min(digital.at+innerHeight*.36,finish.at-innerHeight*.23);
    const entry={x:x(card.left-65),y:top+card.height*.12,at:digital.at-innerHeight*.42,size:76,turn:260,kind:'digital-entry'};
    const middle={x:x(card.left+card.width*.5),y:top+card.height*.64,at:Math.min(digital.at+innerHeight*.02,exitAt-innerHeight*.18),size:68,turn:270,kind:'digital-cross'};
    const exit={x:x(card.right+65),y:top+card.height*.42,at:exitAt,size:70,turn:300,kind:'digital-exit'};
    middle.curve=[{x:x(entry.x+card.width*.19),y:entry.y+card.height*.12},{x:x(middle.x-card.width*.24),y:middle.y+card.height*.28}];
    entry.curve=[{x:x(stops[2].x+(entry.x-stops[1].x)/6),y:stops[2].y+(entry.y-stops[1].y)/6},{x:x(entry.x-card.width*.19),y:entry.y-card.height*.12}];
    exit.curve=[{x:x(middle.x+card.width*.24),y:middle.y-card.height*.28},{x:x(exit.x-card.width*.13),y:exit.y-card.height*.2}];
    finish.curve=[{x:x(exit.x+card.width*.13),y:exit.y+card.height*.2},{x:Math.min(pageWidth-24,finish.x+80),y:finish.y-180}];
    // Mirror the clamped handles as well, preserving tangent continuity on phones.
    middle.curve[0]={x:2*entry.x-entry.curve[1].x,y:2*entry.y-entry.curve[1].y};
    exit.curve[1]={x:2*exit.x-finish.curve[0].x,y:2*exit.y-finish.curve[0].y};
    route=[stops[0],stops[1],stops[2],entry,middle,exit,finish];
    let d=`M${route[0].x},${route[0].y}`;
    lengths=[0];total=0;
    // Catmull–Rom tangents keep the path smooth across each project waypoint.
    for(let i=0;i<route.length-1;i++) {
      const before=route[Math.max(0,i-1)],a=route[i],b=route[i+1],after=route[Math.min(route.length-1,i+2)];
      const c1=b.curve?.[0]||{x:clamp(a.x+(b.x-before.x)/6,24,pageWidth-24),y:a.y+(b.y-before.y)/6};
      const c2=b.curve?.[1]||{x:clamp(b.x-(after.x-a.x)/6,24,pageWidth-24),y:b.y-(after.y-a.y)/6};
      const curve=`C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
      ruler.setAttribute('d',`M${a.x},${a.y}${curve}`);
      total+=ruler.getTotalLength();lengths.push(total);d+=curve;
    }
    trail.setAttribute('viewBox',`0 0 ${document.documentElement.clientWidth} ${document.body.offsetHeight}`);
    trail.setAttribute('width','100%');
    trail.setAttribute('height',document.body.offsetHeight);
    safeMask.setAttribute('x','0');safeMask.setAttribute('y','0');safeMask.setAttribute('width',document.documentElement.clientWidth);safeMask.setAttribute('height',document.body.offsetHeight);
    white.setAttribute('width',document.documentElement.clientWidth);white.setAttribute('height',document.body.offsetHeight);
    [line,halo].forEach(p=>{p.setAttribute('d',d);p.style.strokeDasharray=`0 ${total+1}`});
    easedScroll=scrollY;
    requestDraw();
  }

  function draw(time) {
    frame=0;
    if(!route.length)return;
    const dt=lastTime?Math.min(64,time-lastTime):16;
    lastTime=time;
    // A short, time-based catch-up absorbs wheel steps without locking native scroll.
    easedScroll=clamp(easedScroll,scrollY-innerHeight*.28,scrollY+innerHeight*.28);
    easedScroll=lerp(easedScroll,scrollY,1-Math.exp(-dt/105));
    if(Math.abs(easedScroll-scrollY)<.15)easedScroll=scrollY;
    let n=0;
    while(n<route.length-2 && easedScroll>route[n+1].at)n++;
    const a=route[n],b=route[n+1];
    const t=clamp((easedScroll-a.at)/(b.at-a.at));
    const distance=lerp(lengths[n],lengths[n+1],t);
    const point=line.getPointAtLength(distance);
    const arrival=Math.exp(-Math.pow((t-.98)/.22,2));
    const size=lerp(a.size,b.size,t)*(1+.22*Math.sin(t*Math.PI)+.12*arrival);
    const pose=sceneMotion.update(easedScroll,point,stops,reduced.matches);
    if(reduced.matches) {
      const s=stops[0];
      star.style.transform=`translate(${s.x-60}px,${s.y-60}px) scale(${s.size/120})`;
      shape.setAttribute('d','M60 0Q66 54 120 60Q66 66 60 120Q54 66 0 60Q54 54 60 0Z');
    } else {
      const turn=lerp(lerp(a.turn,b.turn,t),pose.turn,pose.morph);
      star.style.transform=`translate(${point.x-60}px,${point.y-scrollY-60}px) rotate(${turn}deg) scale(${size/120})`;
    }
    star.style.opacity='1';
    const crossing=easedScroll>=route[3].at-innerHeight*.12&&easedScroll<=route[5].at+innerHeight*.12;
    const landed=!reduced.matches&&easedScroll>=route.at(-1).at-.5;
    star.classList.toggle('crossing-project',crossing);
    star.dataset.landed=String(landed);
    star.dataset.routeStage=b.kind||'project';
    document.querySelector('.about-section').classList.toggle('star-landed',landed);
    exclusions.forEach(({element,rect})=>{const r=element.getBoundingClientRect();rect.setAttribute('x',r.left-16);rect.setAttribute('y',r.top+scrollY-16);rect.setAttribute('width',r.width+32);rect.setAttribute('height',r.height+32)});
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
