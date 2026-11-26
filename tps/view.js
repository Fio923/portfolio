(() => {
  const roles={
    user:{title:'TPS · 停车用户端',src:'user/?v=pointer-v2',tip:'可用车辆 DEMO004。搜索 Torino 或点击停车点，开始模拟停车。'},
    officer:{title:'TPS · 巡查员端',src:'officer/?v=pointer-v2',tip:'开始班次后查询 DEMO001（有效）、DEMO002（过期）或 DEMO003（初始宽限期）。'},
    manager:{title:'TPS · 管理员端',src:'manager/?v=pointer-v2',tip:'保留原桌面布局，小屏幕可横向滚动；可使用全屏视图。'},
    system:{title:'TPS · 系统后台',src:'system/admin/',tip:'原 Django / Unfold 界面，演示数据与 Flutter 三端独立保存。'}
  };
  const requested=new URLSearchParams(location.search).get('role');
  const role=Object.hasOwn(roles,requested)?requested:'user',config=roles[role];
  const frame=document.getElementById('app-frame');
  document.title=config.title+'｜在线体验';
  document.getElementById('view-title').textContent=config.title;
  document.getElementById('login-hint').textContent=role==='system'?'无需登录 · 虚构数据 / 本地保存':'演示登录：demo@tps.example / Demo123!';
  document.getElementById('view-tip').textContent=config.tip;
  if(role==='manager'||role==='system')document.body.classList.add('desktop');
  if(role==='system')document.body.classList.add('system');
  if(role==='user'||role==='officer'){
    const stage=document.getElementById('stage'),device=document.getElementById('device');
    document.body.classList.add('phone-mode');
    function resizePhone(){
      const area=getComputedStyle(stage),shell=getComputedStyle(device);
      const bezel=parseFloat(shell.paddingLeft)+parseFloat(shell.borderLeftWidth);
      const width=stage.clientWidth-parseFloat(area.paddingLeft)-parseFloat(area.paddingRight)-bezel*2;
      const height=stage.clientHeight-parseFloat(area.paddingTop)-parseFloat(area.paddingBottom)-bezel*2;
      const scale=Math.min(1,width/413,height/740);
      device.style.width=`${413*scale+bezel*2}px`;device.style.height=`${740*scale+bezel*2}px`;
      frame.style.width='413px';frame.style.height='740px';frame.style.transform=`scale(${scale})`;
    }
    new ResizeObserver(resizePhone).observe(stage);resizePhone();
  }
  document.getElementById('fullscreen').hidden=role!=='manager';
  frame.title=config.title+'原版界面';frame.src=config.src;
  document.getElementById('reset').addEventListener('click',()=>{
    if(confirm('清除当前演示的本地修改并恢复初始数据？'))frame.contentWindow.postMessage(role==='system'?'tps-system-reset':'tps-reset',location.origin);
  });
})();
