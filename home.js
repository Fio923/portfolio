// One star travels between the orbit and the three products. Native scrolling is preserved.
(() => {
  const star = document.querySelector('.travel-star');
  const path = star.querySelector('path');
  const docks = [...document.querySelectorAll('.star-dock')];
  const scenes = [...document.querySelectorAll('.project-scene')];
  const index = [...document.querySelectorAll('.project-index a')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let stops = [], queued = false;
  const lerp = (a,b,t) => a+(b-a)*t;
  const clamp = n => Math.max(0,Math.min(1,n));
  function measure() {
    stops = docks.map((dock,i) => {
      const r = dock.getBoundingClientRect();
      const scene = i ? scenes[i-1].getBoundingClientRect() : null;
      return {x:r.left,y:r.top+scrollY,at:i?scene.top+scrollY+scene.height/2-innerHeight/2:0,
        size:Number(dock.dataset.size)*(innerWidth<761?.72:1),turn:Number(dock.dataset.turn),pinch:Number(dock.dataset.pinch)};
    });
    draw();
  }
  function draw() {
    queued = false;
    if (!stops.length) return;
    if (reduced.matches) {
      const s=stops[0];
      star.style.transform=`translate(${s.x-60}px,${s.y-60}px) scale(${s.size/120})`;
      path.setAttribute('d','M60 0Q66 54 120 60Q66 66 60 120Q54 66 0 60Q54 54 60 0Z');
    } else {
      let n=0;
      while(n<stops.length-2 && scrollY>stops[n+1].at)n++;
      const a=stops[n],b=stops[n+1];
      const t=clamp((scrollY-a.at)/(b.at-a.at));
      const eased=t*t*(3-2*t);
      const x=lerp(a.x,b.x,eased)+Math.sin(t*Math.PI)*(n%2?-55:55);
      const y=lerp(a.y-a.at,b.y-b.at,eased);
      const size=lerp(a.size,b.size,eased)*(1+.28*Math.sin(t*Math.PI));
      const pinch=lerp(a.pinch,b.pinch,eased);
      path.setAttribute('d',`M60 0Q${60+pinch} ${60-pinch} 120 60Q${60+pinch} ${60+pinch} 60 120Q${60-pinch} ${60+pinch} 0 60Q${60-pinch} ${60-pinch} 60 0Z`);
      // Beyond the final product, let the star leave naturally with the page.
      const exit=Math.max(0,scrollY-stops.at(-1).at);
      star.style.transform=`translate(${x-60}px,${y-exit-60}px) rotate(${lerp(a.turn,b.turn,eased)}deg) scale(${size/120})`;
    }
    star.style.opacity='1';
    let active=-1;
    scenes.forEach((scene,i)=>{
      const r=scene.getBoundingClientRect();
      if(r.top<innerHeight*.6 && r.bottom>innerHeight*.4)active=i;
      const drift=Math.max(-45,Math.min(45,(r.top+r.height/2-innerHeight/2)*.08));
      scene.style.setProperty('--drift',reduced.matches?'0px':`${drift}px`);
    });
    index.forEach((link,i)=>{if(i===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
  }
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(draw)}},{passive:true});
  addEventListener('resize',measure);
  addEventListener('load',measure);
  reduced.addEventListener('change',measure);
  measure();
})();
