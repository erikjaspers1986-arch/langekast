
window.addEventListener("error", function(event){
  try{
    var msg=document.getElementById("message");
    if(msg){
      msg.className="msg";
      msg.textContent="Er ging iets mis. Vernieuw de pagina en probeer opnieuw.";
    }
    var spin=document.getElementById("spin");
    if(spin) spin.disabled=false;
  }catch(_){}
  if(window.console) console.error(event.error || event.message);
});

(function(){
"use strict";

var symbolWeights=[
  {s:"🤑",w:10},{s:"💰",w:18},{s:"💵",w:27},{s:"💲",w:45}
];
var payouts={"🤑":100,"💰":40,"💵":15,"💲":6};

var credits=10000,bet=500,highscore=10000,busy=false,soundOn=true,audioCtx=null,allInMode=false;
var unlocked=false,fiveLines=false;
var bonusWin=0,bonusBaseBet=0,wheelBusy=false,wheelRotation=0,grandJackpot=100000;

var cells=[];
for(var r=0;r<3;r++){cells[r]=[];for(var c=0;c<3;c++)cells[r][c]=document.getElementById("c"+r+c)}
var columns=Array.prototype.slice.call(document.querySelectorAll(".column"));
var messageEl=document.getElementById("message");
var creditsEl=document.getElementById("credits");
var betEl=document.getElementById("bet");
var highscoreEl=document.getElementById("highscore");
var spinBtn=document.getElementById("spin");
var betButtons=Array.prototype.slice.call(document.querySelectorAll(".bet-choice[data-bet]"));
var allInBtn=document.getElementById("allInBtn");
var soundBtn=document.getElementById("sound");
var resetBtn=document.getElementById("reset");
var unlockBtn=document.getElementById("unlock");
var jackpotEl=document.getElementById("jackpot");
var jackpotTextEl=document.getElementById("jackpotText");
var jackTitle=document.getElementById("jackTitle");
var confettiEl=document.getElementById("confetti");
var bonusOverlay=document.getElementById("bonusOverlay");
var bonusTotal=document.getElementById("bonusTotal");
var bonusClose=document.getElementById("bonusClose");
var wheelSpin=document.getElementById("wheelSpin");
var wheel=document.getElementById("wheel");
var wheelCtx=wheel.getContext("2d");
var centerCell=document.getElementById("c11");
var lineEls=[
  document.getElementById("topLine"),document.getElementById("midLine"),
  document.getElementById("botLine"),document.getElementById("diag1"),document.getElementById("diag2")
];
var modeText=document.getElementById("modeText");
var adOverlay=document.getElementById("adOverlay");
var adProgress=document.getElementById("adProgress");
var adCountdown=document.getElementById("adCountdown");
var adRewardBtn=document.getElementById("adRewardBtn");
var adCancelBtn=document.getElementById("adCancelBtn");
var adTimer=null,adSeconds=10;

function formatCredits(n){
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,".");
}

function getEffectiveBet(){
  if(allInMode)return credits;
  var multiplier=fiveLines?5:1;
  return Number(bet)*multiplier;
}

function animateLineMode(){
  lineModePanel.classList.remove("mode-flash");
  lineMultiplier.classList.remove("pop");
  void lineModePanel.offsetWidth;
  lineModePanel.classList.add("mode-flash");
  lineMultiplier.classList.add("pop");
}

function update(){
  var effectiveBet=getEffectiveBet();
  creditsEl.textContent=formatCredits(credits);
  betEl.textContent=formatCredits(getEffectiveBet());
  highscoreEl.textContent=formatCredits(highscore);
  effectiveBetEl.textContent=formatCredits(getEffectiveBet());
  lineMultiplier.textContent=fiveLines?"×5":"×1";
  lineModePanel.classList.toggle("five",fiveLines);
  spinBtn.disabled=busy||credits<effectiveBet;
  betButtons.forEach(function(btn){
    var value=parseInt(btn.getAttribute("data-bet"),10);
    var shown=value*(fiveLines?5:1);
    btn.innerHTML="INZET<br>"+formatCredits(shown);
    btn.classList.toggle("active",!allInMode&&value===bet);
    btn.disabled=busy||credits<shown;
    btn.setAttribute("aria-label","Inzet "+formatCredits(shown));
  });
  allInBtn.classList.toggle("active",allInMode);
  allInBtn.disabled=busy||credits<=0;

  if(!unlocked){
    unlockBtn.textContent="🔒 5 winlijnen vergrendeld";
    unlockBtn.className="wide unlock";unlockBtn.disabled=true;
  }else if(!fiveLines){
    unlockBtn.textContent="Activeer 5 winlijnen — inzet wordt ×5";
    unlockBtn.className="wide unlock ready";unlockBtn.disabled=false;
  }else{
    unlockBtn.textContent="✅ 5 winlijnen actief — inzet ×5";
    unlockBtn.className="wide unlock";unlockBtn.disabled=false;
  }

  for(var i=0;i<lineEls.length;i++){
    var base=["line top","line mid active","line bot","line diag1","line diag2"][i];
    if(fiveLines&&i!==1)base+=" active";
    lineEls[i].className=base;
  }
  modeText.textContent=fiveLines?"Vijf winlijnen actief":"Alleen de middelste winlijn is actief";
}

function weightedPick(){
  var roll=Math.random()*100,total=0;
  for(var i=0;i<symbolWeights.length;i++){
    total+=symbolWeights[i].w;
    if(roll<total)return symbolWeights[i].s;
  }
  return "💲";
}

function pickForCell(row,col){
  if(row===1){
    var coinChance=(col===1?0.045:0.018);
    if(Math.random()<coinChance)return "🪙";
  }
  return weightedPick();
}

function tone(freq,duration){
  if(!soundOn)return;
  try{
    var A=window.AudioContext||window.webkitAudioContext;
    if(!A)return;
    if(!audioCtx)audioCtx=new A();
    if(audioCtx.state==="suspended")audioCtx.resume();
    var o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.frequency.value=freq;o.type="sine";g.gain.value=.04;
    o.connect(g);g.connect(audioCtx.destination);o.start();
    g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+(duration||.08));
    o.stop(audioCtx.currentTime+(duration||.08));
  }catch(e){}
}

function rain(amount){
  for(var i=0;i<amount;i++){
    var x=document.createElement("i"),p=["✨","🪙","💵","⚡"];
    x.textContent=p[Math.floor(Math.random()*p.length)];
    x.style.left=Math.random()*100+"vw";
    x.style.fontSize=(15+Math.random()*21)+"px";
    x.style.animationDelay=Math.random()*.3+"s";
    confettiEl.appendChild(x);
    (function(el){setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},2100)})(x);
  }
}

function evaluate(line){
  if(line[0]===line[1]&&line[1]===line[2]&&payouts[line[0]])return payouts[line[0]];
  return 0;
}

function getLines(grid){
  return [
    [grid[0][0],grid[0][1],grid[0][2]],
    [grid[1][0],grid[1][1],grid[1][2]],
    [grid[2][0],grid[2][1],grid[2][2]],
    [grid[0][0],grid[1][1],grid[2][2]],
    [grid[2][0],grid[1][1],grid[0][2]]
  ];
}

function flashLines(hits){
  for(var i=0;i<lineEls.length;i++)lineEls[i].classList.remove("hit");
  for(var j=0;j<hits.length;j++)lineEls[hits[j]].classList.add("hit");
  setTimeout(function(){for(var k=0;k<lineEls.length;k++)lineEls[k].classList.remove("hit")},1500);
}

function showBigWin(amount,mult){
  if(mult>=100)jackTitle.textContent="EPIC WIN";
  else if(mult>=40)jackTitle.textContent="MEGA WIN";
  else jackTitle.textContent="BIG WIN";
  jackpotTextEl.textContent="+"+amount+" credits";
  jackpotEl.classList.add("show");
  setTimeout(function(){jackpotEl.classList.remove("show")},1700);
}


var wheelSegments=[
  {label:"50×",type:"mult",value:50},
  {label:"MINI",type:"mini",value:5000},
  {label:"100×",type:"mult",value:100},
  {label:"250×",type:"mult",value:250},
  {label:"MAJOR",type:"major",value:25000},
  {label:"500×",type:"mult",value:500},
  {label:"1000×",type:"mult",value:1000},
  {label:"GRAND",type:"grand",value:0}
];
var wheelColors=["#5b32ff","#ff36bd","#00dff2","#ff7a24","#316dff","#00d99a","#ff365f","#f5e85b"];

function drawWheel(){
  var cx=350,cy=350,r=330,n=wheelSegments.length,arc=Math.PI*2/n;
  wheelCtx.clearRect(0,0,700,700);
  wheelCtx.save();wheelCtx.translate(cx,cy);
  for(var i=0;i<n;i++){
    var a0=-Math.PI/2+i*arc,a1=a0+arc;
    wheelCtx.beginPath();wheelCtx.moveTo(0,0);wheelCtx.arc(0,0,r,a0,a1);wheelCtx.closePath();
    wheelCtx.fillStyle=wheelColors[i];wheelCtx.fill();
    wheelCtx.strokeStyle="rgba(150,255,245,.82)";wheelCtx.lineWidth=5;wheelCtx.stroke();
    wheelCtx.save();
    wheelCtx.rotate(a0+arc/2);
    wheelCtx.textAlign="right";wheelCtx.textBaseline="middle";
    wheelCtx.fillStyle="#f4ffff";wheelCtx.font="900 34px system-ui";
    wheelCtx.shadowColor="rgba(0,0,0,.8)";wheelCtx.shadowBlur=7;
    wheelCtx.fillText(wheelSegments[i].label,r-35,0);
    wheelCtx.restore();
  }
  wheelCtx.beginPath();wheelCtx.arc(0,0,86,0,Math.PI*2);wheelCtx.fillStyle="#1b1326";wheelCtx.fill();
  wheelCtx.strokeStyle="#fff1a6";wheelCtx.lineWidth=8;wheelCtx.stroke();
  wheelCtx.restore();
}
drawWheel();

function weightedWheelIndex(){
  var weights=[28,12,20,15,6,10,6,3],roll=Math.random()*100,total=0;
  for(var i=0;i<weights.length;i++){total+=weights[i];if(roll<total)return i}
  return 0;
}

function startBonus(){
  busy=true;wheelBusy=false;bonusWin=0;bonusBaseBet=Math.max(1,bet);
  centerCell.classList.add("coin-hit");
  messageEl.className="msg win";messageEl.textContent="BONUSRAD geactiveerd!";
  rain(90);
  [440,554,659,880,1108].forEach(function(n,j){setTimeout(function(){tone(n,.14)},j*90)});
  setTimeout(function(){
    centerCell.classList.remove("coin-hit");
    bonusTotal.textContent="Tik op DRAAI HET RAD";
    wheelSpin.disabled=false;wheelSpin.style.display="block";
    bonusClose.disabled=true;bonusClose.textContent="Prijs innen";
    bonusOverlay.classList.add("show");
  },850);
}

wheelSpin.addEventListener("click",function(){
  if(wheelBusy)return;
  wheelBusy=true;wheelSpin.disabled=true;
  var idx=weightedWheelIndex();
  var n=wheelSegments.length,degPer=360/n;
  var target=360-(idx*degPer+degPer/2);
  wheelRotation+=360*7+target-(wheelRotation%360);
  wheel.style.transform="rotate("+wheelRotation+"deg)";
  bonusTotal.textContent="Het rad draait...";
  [300,340,380,430,500,590].forEach(function(n,j){setTimeout(function(){tone(n,.06)},j*180)});
  setTimeout(function(){
    var prize=wheelSegments[idx],title="";
    if(prize.type==="mult"){
      bonusWin=bonusBaseBet*prize.value;
      title=prize.value+"× INZET";
    }else if(prize.type==="mini"){
      bonusWin=prize.value;title="MINI JACKPOT";
    }else if(prize.type==="major"){
      bonusWin=prize.value;title="MAJOR JACKPOT";
    }else{
      bonusWin=grandJackpot;title="GRAND JACKPOT";
      grandJackpot=100000;
    }
    bonusTotal.textContent=title+" • +"+bonusWin+" credits";
    bonusClose.textContent="+"+bonusWin+" credits innen";
    bonusClose.disabled=false;wheelSpin.style.display="none";
    rain(prize.type==="grand"?180:prize.type==="major"?120:70);
    if(prize.type!=="mult"||prize.value>=250){
      jackTitle.textContent=title;jackpotTextEl.textContent="+"+bonusWin+" credits";
      jackpotEl.classList.add("show");
      setTimeout(function(){jackpotEl.classList.remove("show")},2200);
    }
    [523,659,784,1046,1318].forEach(function(n,j){setTimeout(function(){tone(n,.16)},j*100)});
  },5900);
});

bonusClose.addEventListener("click",function(){
  credits+=bonusWin;if(credits>highscore)highscore=credits;
  bonusOverlay.classList.remove("show");
  messageEl.className="msg win";messageEl.textContent="Bonus gewonnen: +"+bonusWin+" credits";
  wheelBusy=false;busy=false;update();
});

function finish(grid){
  if(grid[1][1]==="🪙"){
    startBonus();
    return;
  }

  var allLines=getLines(grid);
  var active=fiveLines?[0,1,2,3,4]:[1];
  var lineBet=bet;
  var totalWin=0,hits=[],biggest=0;

  for(var i=0;i<active.length;i++){
    var idx=active[i],mult=evaluate(allLines[idx]);
    if(mult>0){
      totalWin+=lineBet*mult;hits.push(idx);if(mult>biggest)biggest=mult;
    }
  }

  if(totalWin>0){
    credits+=totalWin;
    messageEl.className="msg win";
    messageEl.textContent=hits.length+" winlijn"+(hits.length===1?"":"en")+" geraakt • +"+totalWin+" credits";
    flashLines(hits);rain(biggest>=40?70:35);
    [523,659,784,1046].forEach(function(n,j){setTimeout(function(){tone(n,.15)},j*100)});
    if(!unlocked&&hits.indexOf(1)!==-1){
      unlocked=true;
      messageEl.textContent+=" • 5 winlijnen ontgrendeld";
    }
    if(biggest>=15)showBigWin(totalWin,biggest);
  }else{
    messageEl.className="msg";
    messageEl.textContent=fiveLines?"Geen drie gelijke symbolen op de vijf lijnen.":"Geen drie gelijke symbolen op de middelste lijn.";
    tone(130,.15);
  }

  if(credits>highscore)highscore=credits;
  busy=false;update();
}


function activePaylinesForGrid(grid){
  var lines=[
    [[1,0],[1,1],[1,2]]
  ];
  if(fiveLines){
    lines=[
      [[0,0],[0,1],[0,2]],
      [[1,0],[1,1],[1,2]],
      [[2,0],[2,1],[2,2]],
      [[0,0],[1,1],[2,2]],
      [[2,0],[1,1],[0,2]]
    ];
  }
  return lines;
}

function gridHasOrdinaryWin(grid){
  return activePaylinesForGrid(grid).some(function(line){
    var a=grid[line[0][0]][line[0][1]];
    var b=grid[line[1][0]][line[1][1]];
    var c=grid[line[2][0]][line[2][1]];
    return a!=="🪙"&&a===b&&b===c;
  });
}

function forceLosingGrid(){
  return [
    ["🤑","💰","💵"],
    ["💲","💵","💰"],
    ["💰","🤑","💲"]
  ];
}

function spin(){
  var actualBet=getEffectiveBet();
  if(busy||actualBet<=0||credits<actualBet)return;
  busy=true;
  credits-=actualBet;
  grandJackpot+=Math.max(1,Math.floor(actualBet*0.02));
  messageEl.className="msg";
  messageEl.textContent=allInMode?"ALL INN — alles of niets...":"Rollen draaien...";
  columns.forEach(function(x){x.classList.add("spin")});update();

  var timer=setInterval(function(){
    for(var r=0;r<3;r++)for(var c=0;c<3;c++)cells[r][c].textContent=pickForCell(r,c);
  },80);

  var grid=[[],[],[]];

  if(allInMode){
    var allInWin=Math.random()<0.5;
    if(allInWin){
      var winSymbol=weightedPick();
      // Force a middle-line win; this preserves the game's normal payout logic.
      for(var cc=0;cc<3;cc++)grid[1][cc]=winSymbol;
      for(var c1=0;c1<3;c1++){grid[0][c1]=pickForCell(0,c1);grid[2][c1]=pickForCell(2,c1);}
    }else{
      // Force a losing grid and prevent the bonus coin from rescuing the spin.
      var loseRows=[
        ["🤑","💰","💵"],
        ["💲","💵","💰"],
        ["💰","🤑","💲"]
      ];
      for(var lr=0;lr<3;lr++)for(var lc=0;lc<3;lc++)grid[lr][lc]=loseRows[lr][lc];
    }
  }else{
    for(var rr=0;rr<3;rr++)for(var cc2=0;cc2<3;cc2++)grid[rr][cc2]=pickForCell(rr,cc2);
    if(gridHasOrdinaryWin(grid)&&Math.random()>0.30){
      grid=forceLosingGrid();
    }
  }

  setTimeout(function(){
    clearInterval(timer);
    for(var r=0;r<3;r++)for(var c=0;c<3;c++)cells[r][c].textContent=grid[r][c];
    columns.forEach(function(x){x.classList.remove("spin")});
    var wasAllIn=allInMode;
    finish(grid);
    if(wasAllIn){
      if(credits===0){
        allInMode=false;
        messageEl.className="msg";
        messageEl.textContent="ALL INN verloren — al je credits zijn weg.";
      }else{
        allInMode=true;
        messageEl.className="msg win";
        messageEl.textContent="ALL INN blijft actief: volgende inzet is automatisch "+formatCredits(credits)+" credits.";
      }
      update();
    }
  },1150);
}

spinBtn.addEventListener("click",spin);

betButtons.forEach(function(btn){
  btn.addEventListener("click",function(){
    if(busy)return;
    var value=parseInt(btn.getAttribute("data-bet"),10);
    var required=value*(fiveLines?5:1);if(credits>=required){allInMode=false;bet=value;messageEl.className="msg";messageEl.textContent="Totale inzet ingesteld op "+formatCredits(required)+" credits.";tone(650,.06);update();}
  });
});
allInBtn.addEventListener("click",function(){
  if(busy||credits<=0)return;
  allInMode=true;
  bet=credits;
  messageEl.className="msg win";
  messageEl.textContent="ALL INN geselecteerd: "+formatCredits(credits)+" credits. 50% kans op winst, 50% kans alles kwijt.";
  tone(920,.12);update();
});
unlockBtn.addEventListener("click",function(){
  if(!unlocked||busy)return;
  fiveLines=!fiveLines;
  update();
  animateLineMode();
  var total=getEffectiveBet();
  if(fiveLines){
    messageEl.className="msg win";
    messageEl.textContent="5 winlijnen actief — totale inzet nu ×5: "+formatCredits(total)+" credits.";
    tone(980,.12);setTimeout(function(){tone(1240,.12)},110);
  }else{
    messageEl.className="msg";
    messageEl.textContent="1 winlijn actief — totale inzet terug naar "+formatCredits(total)+" credits.";
    tone(720,.12);
  }
});
resetBtn.addEventListener("click",function(){
  if(busy)return;
  adSeconds=10;
  adProgress.style.width="0%";
  adCountdown.textContent="10 seconden";
  adRewardBtn.disabled=true;
  adRewardBtn.textContent="Even wachten…";
  adOverlay.classList.add("show");
  if(adTimer)clearInterval(adTimer);
  adTimer=setInterval(function(){
    adSeconds--;
    adProgress.style.width=((10-adSeconds)*10)+"%";
    adCountdown.textContent=adSeconds>0?adSeconds+" seconden":"Reclame voltooid";
    if(adSeconds<=0){
      clearInterval(adTimer);adTimer=null;
      adRewardBtn.disabled=false;
      adRewardBtn.textContent="Ontvang 10.000 credits";
    }
  },1000);
});
adCancelBtn.addEventListener("click",function(){
  if(adTimer){clearInterval(adTimer);adTimer=null;}
  adOverlay.classList.remove("show");
});
adRewardBtn.addEventListener("click",function(){
  if(adRewardBtn.disabled)return;
  credits=10000;bet=500;unlocked=false;fiveLines=false;busy=false;allInMode=false;grandJackpot=100000;
  adOverlay.classList.remove("show");
  messageEl.className="msg win";
  messageEl.textContent="Reclame voltooid — 10.000 credits ontvangen.";
  update();
});
soundBtn.addEventListener("click",function(){
  soundOn=!soundOn;soundBtn.textContent=soundOn?"🔊 Geluid aan":"🔇 Geluid uit";if(soundOn)tone(700,.08);
});
jackpotEl.addEventListener("click",function(){jackpotEl.classList.remove("show")});
update();
})();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  });
}
