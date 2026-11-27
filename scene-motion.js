// Scroll-scrubbed binary illustrations. No clocks, loops or random animation state.
window.createPortfolioScenes = function(scenes, star) {
  const canvas=document.createElement('canvas');
  canvas.className='binary-scenes';canvas.setAttribute('aria-hidden','true');
  document.body.prepend(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  const mask=document.createElement('canvas');mask.width=300;mask.height=400;
  const pen=mask.getContext('2d',{willReadFrequently:true});
  const svg=star.querySelector('svg'),outline=svg.querySelector('path');
  const ns='http://www.w3.org/2000/svg';
  const details=document.createElementNS(ns,'g');details.classList.add('morph-details');
  svg.append(details);
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const starD='M60 0Q66 54 120 60Q66 66 60 120Q54 66 0 60Q54 54 60 0Z';
  const shapes=[
    'M36 48L74 48L74 58L92 38L108 43L112 54L98 58L80 82L76 99L34 99L29 76C8 75 5 56 14 43C20 35 31 38 36 43Z',
    'M15 72L20 52Q22 46 33 46L46 29Q51 23 62 23L83 25Q91 27 95 38L103 49Q114 51 114 64L114 85L102 85Q99 99 89 99Q79 99 76 85L45 85Q41 99 31 99Q20 99 18 85L10 84L10 74Z',
    'M39 20Q33 17 33 25L33 96Q33 104 41 100L99 66Q108 60 99 54Z'
  ];
  const iconDetails=[
    '<path d="M29 50C17 43 10 59 18 65L28 69Z" fill="white"/><path d="M43 43H66" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="m95 42 7 12" stroke="white" stroke-width="2"/>',
    '<path d="M48 34H62V49H37ZM68 34h14q4 0 7 15H68Z" fill="white"/><circle cx="31" cy="85" r="7" fill="white"/><circle cx="89" cy="85" r="7" fill="white"/><path d="M105 61h6" stroke="white" stroke-width="3"/>',
    '<circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".22"/>'
  ];
  function sample(d){const p=document.createElementNS(ns,'path');p.setAttribute('d',d);const len=p.getTotalLength();return Array.from({length:80},(_,i)=>{const v=p.getPointAtLength(len*i/80);return {x:v.x,y:v.y}})}
  const original=sample(starD);
  // Align the starting point and winding to avoid a spinning knot during morphs.
  function align(points){let best=points,score=Infinity;for(const order of [points,[...points].reverse()])for(let offset=0;offset<80;offset++){let cost=0;for(let i=0;i<80;i++){const p=order[(i+offset)%80];cost+=(p.x-original[i].x)**2+(p.y-original[i].y)**2}if(cost<score){score=cost;best=order.map((_,i)=>order[(i+offset)%80])}}return best}
  const targets=shapes.map(d=>align(sample(d)));
  let boxes=[],width=0,height=0,dpr=1,lastIcon=-1;

  function geometry(scene){
    const visual=scene.querySelector('.scene-visual').getBoundingClientRect();
    const pictures=[...scene.querySelectorAll('.visual-link,.care-moment')].map(e=>e.getBoundingClientRect());
    const left=Math.min(...pictures.map(r=>r.left)),right=Math.max(...pictures.map(r=>r.right));
    const imageTop=Math.min(...pictures.map(r=>r.top));
    const small=width<960;
    if(small){
      const w=Math.min(115,width*.29),y=imageTop+scrollY-130;
      return {left:{x:18,y,w,h:110},right:{x:width-18-w,y,w,h:110},
        anchor:{x:width*.5,y:imageTop+scrollY-54},protect:pictures,small};
    }
    const padding=32,gap=48;
    const lw=Math.max(50,left-gap-padding),rw=Math.max(50,width-padding-right-gap);
    const lwc=Math.min(390,lw),rwc=Math.min(390,rw);
    const h=Math.min(520,Math.max(300,visual.height*.95));
    const y=visual.top+scrollY+(visual.height-h)/2;
    const leftBox={x:padding+(lw-lwc)/2,y,w:lwc,h};
    const rightBox={x:right+gap+(rw-rwc)/2,y,w:rwc,h};
    return {left:leftBox,right:rightBox,anchor:{x:leftBox.x+leftBox.w*.53,y:y+h*.18},protect:pictures,small};
  }
  function measure(){
    width=document.documentElement.clientWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    boxes=scenes.map(geometry);
    return boxes.map(b=>b.anchor);
  }
  function line(points,lineWidth=10){pen.lineWidth=lineWidth;pen.lineCap='round';pen.lineJoin='round';pen.beginPath();points.forEach((p,i)=>i?pen.lineTo(...p):pen.moveTo(...p));pen.stroke()}
  function leaf(x,y,size,direction){pen.beginPath();pen.moveTo(x,y);pen.quadraticCurveTo(x+direction*size*.3,y-size,x+direction*size,y-size*.9);pen.quadraticCurveTo(x+direction*size*.9,y+size*.1,x,y);pen.fill()}
  function plant(p,small=false){
    const growth=smooth(.15,.78,p),base=335;
    line([[105,338],[115,385],[186,385],[198,338],[105,338]],9);
    const stem=220*growth;pen.beginPath();pen.moveTo(150,base);pen.bezierCurveTo(137,base-stem*.35,167,base-stem*.65,153,base-stem);pen.lineWidth=8;pen.stroke();
    for(let i=0;i<(small?3:7);i++){const born=smooth(.16+i*.075,.35+i*.07,p);if(born<=0)continue;const y=base-30-i*29;leaf(150,y,Math.min(96,45+i*7)*born,i%2?1:-1)}
  }
  function droplets(p){
    const fall=smooth(.16,.68,p);
    for(let i=0;i<13;i++){const t=clamp(fall*1.9-i*.065);if(t<=0||t>=1)continue;const x=135+i%3*12+Math.sin(t*2)*20,y=40+t*185;pen.beginPath();pen.moveTo(x,y-9);pen.quadraticCurveTo(x-11,y+6,x,y+9);pen.quadraticCurveTo(x+11,y+6,x,y-9);pen.fill()}
    pen.save();pen.translate(15,100);pen.scale(.9,.7);plant(p,true);pen.restore();
  }
  function parking(p){
    line([[40,15],[40,390]],7);line([[255,15],[255,390]],7);
    [90,180,270,360].forEach(y=>line([[176,y],[248,y]],5));
    const found=smooth(.24,.58,p);line([[142,18],[142,45+found*270]],10);
    pen.save();pen.globalAlpha=smooth(.26,.42,p);pen.font='bold 53px Arial';pen.fillText('P',190,245);pen.restore();
    if(p>.65){line([[190,287],[205,302],[234,268]],11)}
  }
  function verification(p){
    pen.lineWidth=7;pen.beginPath();pen.roundRect(32,100,240,160,15);pen.stroke();
    line([[57,132],[111,132]],6);pen.font='bold 39px monospace';pen.fillText('DEMO',58,202);
    const scan=smooth(.25,.72,p);line([[43+scan*216,79],[43+scan*216,282]],8);
    const checked=smooth(.57,.82,p);if(checked>0){pen.save();pen.translate(150,323);pen.scale(checked,checked);pen.beginPath();pen.arc(0,0,37,0,Math.PI*2);pen.stroke();line([[-18,0],[-3,14],[23,-17]],9);pen.restore()}
  }
  function content(p){
    const unfold=smooth(.12,.48,p);
    pen.lineWidth=7;pen.beginPath();pen.roundRect(46,30,205,220*unfold,10);pen.stroke();
    for(let i=0;i<5;i++){if(unfold<i*.15)continue;line([[76,70+i*32],[i%2?185:218,70+i*32]],7)}
    for(let i=0;i<21;i++){const x=40+i*11,amp=(9+Math.sin(i*.8+p*10)*18)*smooth(.27,.7,p);line([[x,325-amp],[x,325+amp]],6)}
  }
  function person(p){
    const form=smooth(.23,.73,p);pen.save();pen.beginPath();pen.rect(0,400*(1-form),300,400);pen.clip();
    pen.lineWidth=9;pen.beginPath();pen.ellipse(152,119,54,70,0,0,Math.PI*2);pen.stroke();
    pen.beginPath();pen.moveTo(63,353);pen.bezierCurveTo(58,260,95,225,119,211);pen.lineTo(185,211);pen.bezierCurveTo(219,230,244,266,240,353);pen.closePath();pen.stroke();
    line([[123,223],[151,264],[181,222]],7);line([[129,112],[136,112]],5);line([[169,112],[176,112]],5);
    if(p>.52){const speak=smooth(.52,.8,p);for(let i=0;i<9;i++){const x=123+i*7,amp=(3+Math.sin(i*.9+p*24)**2*9)*speak;line([[x,157-amp],[x,157+amp]],5)}}
    pen.restore();
  }
  function binary(draw,box,p,alpha,side){
    if(alpha<.003||box.w<35)return;
    pen.clearRect(0,0,300,400);pen.fillStyle='#000';pen.strokeStyle='#000';draw(p);
    const pixels=pen.getImageData(0,0,300,400).data;
    const scale=Math.min(box.w/300,box.h/400),ox=box.x+(box.w-300*scale)/2,oy=box.y-scrollY+(box.h-400*scale)/2;
    ctx.save();ctx.beginPath();ctx.rect(box.x,box.y-scrollY,box.w,box.h);ctx.clip();
    ctx.font=`${width<960?Math.max(3.6,7.5*scale):Math.min(9,Math.max(6.5,8.5*scale))}px ui-monospace,Consolas,monospace`;ctx.textBaseline='middle';
    const scatter=smooth(.8,1,p)*32;
    const dx=Math.max(7,Math.ceil((width<960?4:5)/scale)),dy=Math.max(8,Math.ceil((width<960?5:7)/scale));
    for(let y=5;y<400;y+=dy)for(let x=4;x<300;x+=dx){
      const ink=pixels[(y*300+x)*4+3]/255;if(ink<.2)continue;
      const seed=x*11+y*17+side*101,rand=noise(seed);
      if(rand<.12)continue;
      ctx.globalAlpha=alpha*(.48+rand*.42)*ink;ctx.fillStyle=rand>.94?'#5b7eae':'#8197b4';
      ctx.fillText((Math.floor(rand*17+p*5)%2)?'1':'0',ox+x*scale+(rand-.5)*scatter,oy+y*scale+(noise(seed+1)-.5)*scatter);
    }
    ctx.restore();
  }
  function update(scroll,point,stops,reduced){
    ctx.clearRect(0,0,width,height);
    let chosen=-1,strength=0,phase=0;
    scenes.forEach((scene,i)=>{
      const at=stops[i+1].at,span=innerHeight*.68;
      const p=(scroll-at+span)/(span*2);
      const visible=smooth(.02,.22,p)*(1-smooth(.78,1,p));
      scene.dataset.motionPhase=clamp(p).toFixed(3);
      if(reduced||visible<.003)return;
      const b=boxes[i];
      // The mask is restricted to the side lanes; an additional image exclusion
      // remains in place during parallax, rotation and responsive layout changes.
      ctx.save();
      scene.querySelectorAll('.visual-link,.care-moment').forEach(e=>{const r=e.getBoundingClientRect();ctx.beginPath();ctx.rect(0,0,width,height);ctx.rect(r.left-18,r.top-18,r.width+36,r.height+36);ctx.clip('evenodd')});
      const left=[droplets,parking,content][i],right=[plant,verification,person][i];
      binary(left,b.left,p,visible*.8,i*2);binary(right,b.right,p,visible*.86,i*2+1);
      ctx.restore();
      const morph=smooth(.14,.32,p)*(1-smooth(.68,.86,p));
      if(morph>strength){chosen=i;strength=morph;phase=p}
    });
    const target=chosen<0?original:targets[chosen];
    outline.setAttribute('d',original.map((p,i)=>`${i?'L':'M'}${lerp(p.x,target[i].x,strength).toFixed(2)},${lerp(p.y,target[i].y,strength).toFixed(2)}`).join('')+'Z');
    if(chosen!==lastIcon){details.innerHTML=chosen<0?'':iconDetails[chosen];lastIcon=chosen}
    details.style.opacity=String(smooth(.35,.9,strength));
    star.dataset.form=chosen<0?'star':['watering-can','car','play'][chosen];
    star.dataset.morph=strength.toFixed(3);
    const turn=chosen===0?lerp(5,29,smooth(.28,.62,phase)):0;
    return {morph:strength,turn};
  }
  return {measure,update};
};
