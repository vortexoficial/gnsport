/* GN Sports — Página inicial · scripts (extraído de preview-pro/index.html) */

(function(){
  'use strict';
  var WA = '5500000000000';

  /* ===== Sticky header shadow ===== */
  var header = document.getElementById('header');
  window.addEventListener('scroll', function(){
    header.classList.toggle('scrolled', window.scrollY > 8);
  }, {passive:true});

  /* ===== Mobile menu ===== */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  var overlay = document.getElementById('overlay');
  var mmClose = document.getElementById('mmClose');
  function openMenu(){
    mobileMenu.classList.add('open');
    overlay.classList.add('show');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded','true');
    document.body.style.overflow='hidden';
  }
  function closeMenu(){
    mobileMenu.classList.remove('open');
    overlay.classList.remove('show');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded','false');
    document.body.style.overflow='';
  }
  hamburger.addEventListener('click', function(){
    mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
  });
  mmClose.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeMenu(); });
  document.querySelectorAll('.mobile-menu a').forEach(function(a){
    a.addEventListener('click', closeMenu);
  });

  /* ===== Product Carousels ===== */
  (function(){
    var GAP=16, DELAY=3000, CL=3, MOBGAP=12;
    var EASE='transform .65s cubic-bezier(.4,0,.2,1)';
    var SLOP=8;            // px antes de decidir o eixo do gesto
    var DEADZONE=6;        // px antes de começar a medir intenção
    var DIST_FRAC=0.18;    // fração de um passo que conta como avanço
    var FLING=0.45;        // px/ms de velocidade que força avançar 1 card
    var WRAP_FALLBACK=720; // ms de watchdog (> a transição de .65s)

    document.querySelectorAll('.cr-outer').forEach(function(outer){
      var track=outer.querySelector('.cr-track');
      if(!track) return;

      var isMV=outer.classList.contains('cr-outer--mv');
      var isLN=outer.classList.contains('cr-outer--ln');
      var dir=parseInt(outer.getAttribute('data-dir')||'1',10);

      var orig=Array.from(track.children), N=orig.length, logIdx=0;
      var tmr=null, wrapTO=null;

      // ----- clones do loop infinito -----
      orig.slice(N-CL).reverse().forEach(function(c){
        var cl=c.cloneNode(true);cl.setAttribute('aria-hidden','true');cl.setAttribute('tabindex','-1');
        track.insertBefore(cl,track.firstChild);
      });
      orig.slice(0,CL).forEach(function(c){
        var cl=c.cloneNode(true);cl.setAttribute('aria-hidden','true');cl.setAttribute('tabindex','-1');
        track.appendChild(cl);
      });

      // ----- dots indicadores (apenas LN) -----
      var dotsEl=null;
      if(isLN){
        dotsEl=document.createElement('div');
        dotsEl.className='cr-dots';
        outer.parentNode.insertBefore(dotsEl,outer.nextSibling);
        for(var d=0;d<N;d++){
          (function(di){
            var dot=document.createElement('button');
            dot.type='button';
            dot.className='cr-dot'+(di===0?' cr-dot--on':'');
            dot.setAttribute('aria-label','Item '+(di+1));
            dot.addEventListener('click',function(){ stop(); goTo(di,true); start(); });
            dotsEl.appendChild(dot);
          })(d);
        }
      }

      function isMobMV(){ return isMV&&window.innerWidth<=640; }
      function isMobLN(){ return isLN&&window.innerWidth<=640; }
      function vis(){ return window.innerWidth>860?4:window.innerWidth>540?2:1; }
      function gap(){ return isMobLN()?MOBGAP:GAP; }
      function mobPeek(){ return Math.max(40,Math.round(window.innerWidth*0.115)); }
      function cw(){
        if(isMobLN()){ var pk=mobPeek(); return window.innerWidth-2*pk-2*MOBGAP; }
        return (outer.offsetWidth-(vis()-1)*GAP)/vis();
      }
      function step(){ return cw()+gap(); }
      // deslocamento em repouso (magnitude positiva) de um índice físico
      function physOff(pi){
        var w=cw(), base=pi*(w+gap());
        if(isMobLN()) base-=(window.innerWidth-w)/2; // centraliza o card ativo
        return base;
      }
      function offFor(li){ return -physOff(li+CL); } // translateX alvo

      function setW(){
        if(isMobMV())return;
        var w=cw();
        Array.from(track.children).forEach(function(c){ c.style.width=w+'px'; });
      }

      function updActive(li){
        var realLi=((li%N)+N)%N;
        if(isMobLN()){
          var pi=li+CL;
          Array.from(track.children).forEach(function(c,ci){
            if(ci===pi) c.classList.add('cr-active'); else c.classList.remove('cr-active');
          });
        }
        if(dotsEl){
          Array.from(dotsEl.children).forEach(function(dot,di){
            if(di===realLi) dot.classList.add('cr-dot--on'); else dot.classList.remove('cr-dot--on');
          });
        }
      }

      // translateX ao vivo a partir da matriz computada (pega arrasto no meio do slide)
      function curTranslate(){
        var m=window.getComputedStyle(track).transform;
        if(m && m!=='none'){
          var mm=m.match(/matrix.*\((.+)\)/);
          if(mm){
            var v=mm[1].split(', ');
            return v.length>6 ? parseFloat(v[12]) : parseFloat(v[4]);
          }
        }
        return offFor(logIdx);
      }

      // ----- movimento programático animado -----
      function goTo(li,anim){
        if(isMobMV())return;
        logIdx=li;
        clearWrap();
        track.classList.remove('cr-nofx');
        track.style.transition = anim ? EASE : 'none';
        track.style.transform = 'translateX('+offFor(li)+'px)';
        updActive(li);
        if(anim && (li>=N || li<0)) scheduleWrap(); // watchdog reforça o transitionend
      }

      // ----- reposição silenciosa sem emenda visível (1 frame, sem fade) -----
      function silentTo(li){
        if(isMobMV())return;
        logIdx=li;
        track.classList.add('cr-nofx');        // congela track + transições dos cards
        track.style.transition='none';
        track.style.transform='translateX('+offFor(li)+'px)';
        updActive(li);                         // troca cr-active congelado -> sem fade
        void track.offsetWidth;                // commita o frame congelado de forma síncrona
        requestAnimationFrame(function(){ track.classList.remove('cr-nofx'); });
      }

      // ----- orquestração do wrap (idempotente; re-checa o range) -----
      function clearWrap(){ if(wrapTO){ clearTimeout(wrapTO); wrapTO=null; } }
      function scheduleWrap(){ clearWrap(); wrapTO=setTimeout(doWrap,WRAP_FALLBACK); }
      function doWrap(){
        clearWrap();
        if(logIdx>=N) silentTo(logIdx-N);
        else if(logIdx<0) silentTo(logIdx+N);
      }
      // fix A: só o fim da transição de transform DO TRACK dispara o wrap;
      // os fins de opacity/transform/box-shadow dos cards (que sobem por bubbling) são ignorados.
      track.addEventListener('transitionend',function(e){
        if(e.target!==track) return;
        if(e.propertyName!=='transform') return;
        doWrap();
      });

      // ----- autoplay -----
      function adv(){ goTo(logIdx+dir,true); }
      function start(){ stop(); tmr=setInterval(adv,DELAY); }
      function stop(){ if(tmr){ clearInterval(tmr); tmr=null; } }

      // ----- init -----
      setW();
      silentTo(0);
      start();

      // ----- pausa no hover (desktop) -----
      outer.addEventListener('mouseenter',stop);
      outer.addEventListener('mouseleave',function(){ if(!dragging) start(); });

      // ----- botões prev/next (desktop) -----
      var blk=outer.closest('.prod-block');
      if(blk){
        var pb=blk.querySelector('.cr-prev'), nb=blk.querySelector('.cr-next');
        if(pb)pb.addEventListener('click',function(){ stop(); goTo(logIdx-1,true); start(); });
        if(nb)nb.addEventListener('click',function(){ stop(); goTo(logIdx+1,true); start(); });
      }

      // ================= ARRASTO / SWIPE (LN mobile) =================
      var dragging=false, decided=false, locked=false;
      var startX=0, startY=0, baseTx=0, curDx=0, lastX=0, lastT=0, velX=0;
      var pid=null, rafId=null, swiped=false;

      function rafFollow(){
        rafId=null;
        track.style.transform='translateX('+(baseTx+curDx)+'px)';
      }
      function requestFollow(){
        if(rafId==null) rafId=window.requestAnimationFrame(rafFollow);
      }

      function onDown(e){
        if(!isMobLN())return;
        if(e.pointerType==='mouse' && e.button!==0) return;
        dragging=true; decided=false; locked=false; swiped=false;
        pid=e.pointerId;
        startX=e.clientX; startY=e.clientY;
        lastX=e.clientX; lastT=(e.timeStamp||Date.now()); velX=0; curDx=0;
        clearWrap();                // nunca deixar um wrap pendente disparar durante o arrasto
        stop();                     // pausa autoplay enquanto o ponteiro está pressionado
        baseTx=curTranslate();      // pega a posição AO VIVO (sem solavanco no meio do slide)
        track.style.transition='none';
      }

      function onMove(e){
        if(!dragging || e.pointerId!==pid) return;
        var dx=e.clientX-startX, dy=e.clientY-startY;
        if(!decided){
          if(Math.abs(dx)<DEADZONE && Math.abs(dy)<DEADZONE) return;
          decided=true;
          if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>=SLOP){
            locked=true;
            track.classList.add('cr-dragging');
            if(track.setPointerCapture){ try{ track.setPointerCapture(pid); }catch(_e){} }
          }else{
            // intenção vertical: deixa a página rolar, abandona o arrasto
            dragging=false; start();
            return;
          }
        }
        if(!locked) return;
        if(e.cancelable) e.preventDefault();
        var now=(e.timeStamp||Date.now()), dt=now-lastT;
        if(dt>0){ velX=(e.clientX-lastX)/dt; lastX=e.clientX; lastT=now; }
        curDx=dx;
        if(Math.abs(dx)>SLOP) swiped=true;
        requestFollow();
      }

      function endDrag(e){
        if(!dragging || (e && e.pointerId!==pid)) return;
        dragging=false;
        if(rafId!=null){ window.cancelAnimationFrame(rafId); rafId=null; }
        track.classList.remove('cr-dragging');
        if(track.releasePointerCapture && pid!=null){
          try{ track.releasePointerCapture(pid); }catch(_e){}
        }
        var wasLocked=locked, dx=curDx, v=velX;
        pid=null; locked=false; decided=false; curDx=0;

        if(!wasLocked){
          // nunca foi sequestrado (toque ou vertical) -> re-encaixa e retoma
          silentTo(logIdx);
          start();
          return;
        }

        var s=step(), threshold=s*DIST_FRAC, move=0;
        // arrastar p/ ESQUERDA (dx<0) avança; p/ DIREITA (dx>0) volta.
        // o passo é constante por índice pois o offset de centro é constante.
        if(dx<=-threshold || v<=-FLING) move=1;
        else if(dx>=threshold || v>=FLING) move=-1;

        track.classList.remove('cr-nofx');
        goTo(logIdx+move,true);     // anima até o centro encaixado; faz wrap se sair do range
        start();
      }

      if(window.PointerEvent){
        track.addEventListener('pointerdown',onDown);
        track.addEventListener('pointermove',onMove,{passive:false});
        track.addEventListener('pointerup',endDrag);
        track.addEventListener('pointercancel',endDrag);
        track.addEventListener('lostpointercapture',function(e){ if(dragging) endDrag(e); });
      }

      // engole o clique-fantasma depois de um swipe real (fase de captura)
      track.addEventListener('click',function(e){
        if(swiped){ e.preventDefault(); e.stopPropagation(); swiped=false; }
      },true);

      // ----- resize: aborta arrasto, normaliza índice, re-encaixa silencioso -----
      window.addEventListener('resize',function(){
        clearWrap();
        if(dragging){
          dragging=false; decided=false; locked=false; pid=null; curDx=0;
          if(rafId!=null){ window.cancelAnimationFrame(rafId); rafId=null; }
          track.classList.remove('cr-dragging');
        }
        logIdx=((logIdx%N)+N)%N;    // mantém a geometria válida ao trocar de modo
        setW();
        silentTo(logIdx);           // re-encaixe em frame congelado: sem flash, nunca trava num clone
      });
    });
  })();

  /* ===== Size selection rewrites the WhatsApp message (with default M) ===== */
  function buildBuyHref(card, size){
    var name = card.getAttribute('data-name') || 'a camisa';
    var price = card.getAttribute('data-price') || '';
    var msg = 'Olá GN Sports! Quero a ' + name + ' (tam ' + size + ')' + (price ? ' por ' + price : '') + '.';
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
  }
  function activeSize(group){
    var a = group.querySelector('.size.active');
    return a ? a.textContent.trim() : 'M';
  }
  document.querySelectorAll('#grid .card').forEach(function(card){
    var group = card.querySelector('.sizes');
    var buy = card.querySelector('.btn-wa');
    if(!group || !buy) return;
    function sync(){ buy.setAttribute('href', buildBuyHref(card, activeSize(group))); }
    group.querySelectorAll('.size').forEach(function(sz){
      sz.addEventListener('click', function(){
        group.querySelectorAll('.size').forEach(function(s){
          s.classList.remove('active'); s.setAttribute('aria-pressed','false');
        });
        sz.classList.add('active'); sz.setAttribute('aria-pressed','true');
        sync();
      });
    });
    sync(); /* ensure pre-selected M is already in the message on load */
  });

  /* ===== Favourites ===== */
  document.querySelectorAll('.fav').forEach(function(btn){
    btn.addEventListener('click', function(){
      var on = btn.classList.toggle('on');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  });

  /* countdown dos slides removido — slides agora são vídeo/imagem sem texto */

  /* ===== Hero carousel — pointer events (mouse + touch unificados) ===== */
  (function(){
    var carousel = document.querySelector('.hero-carousel');
    var track    = document.querySelector('.hero-carousel__track');
    var slides   = document.querySelectorAll('.hero-slide');
    var dots     = document.querySelectorAll('.hero-dot');
    if(!carousel || !track || !slides.length) return;
    var n = slides.length, cur = 0, timer;

    /* ---- vídeo do slide 0 ---- */
    var vDsk = slides[0].querySelector('.hs-video--desktop');
    var vMob = slides[0].querySelector('.hs-video--mobile');

    function clearVid(){
      if(vDsk) vDsk.onended = null;
      if(vMob) vMob.onended = null;
    }

    function playVid(){
      /* reinicia o vídeo ativo ao entrar no slide 0 */
      var v = (window.innerWidth <= 760 ? vMob : vDsk) || vDsk || vMob;
      if(!v) return;
      try{ v.currentTime = 0; }catch(e){}
      var p = v.play(); if(p && p.catch) p.catch(function(){});
    }

    function scheduleNext(){
      clearTimeout(timer);
      clearVid();
      if(cur === 0){
        playVid();
        function onEnd(){
          if(cur !== 0) return;
          clearTimeout(timer); clearVid(); goTo(1);
        }
        if(vDsk) vDsk.onended = onEnd;
        if(vMob) vMob.onended = onEnd;
        timer = setTimeout(function(){ if(cur===0){ clearVid(); goTo(1); } }, 9000);
      } else {
        timer = setTimeout(function(){ goTo(cur + 1); }, 9000);
      }
    }

    function goTo(idx){
      slides[cur].setAttribute('aria-hidden','true');
      dots[cur].classList.remove('active');
      dots[cur].setAttribute('aria-selected','false');
      cur = ((idx % n) + n) % n;
      track.style.transition = '';
      track.style.transform  = 'translateX(-' + (cur * 100) + '%)';
      slides[cur].removeAttribute('aria-hidden');
      dots[cur].classList.add('active');
      dots[cur].setAttribute('aria-selected','true');
      scheduleNext();
    }

    dots.forEach(function(d,i){ d.addEventListener('click', function(){ goTo(i); }); });

    /* ---- Drag com Pointer Events (mouse + touch em uma única API) ---- */
    var sx=0, sy=0, active=false, locked=null;

    carousel.addEventListener('pointerdown', function(e){
      sx=e.clientX; sy=e.clientY; active=true; locked=null;
      track.style.transition='none';
      e.preventDefault();
    });

    document.addEventListener('pointermove', function(e){
      if(!active) return;
      var dx=e.clientX-sx, dy=e.clientY-sy;
      if(!locked && (Math.abs(dx)>8 || Math.abs(dy)>8))
        locked = Math.abs(dx)>=Math.abs(dy) ? 'h' : 'v';
      if(locked==='h')
        track.style.transform='translateX(calc(-'+(cur*100)+'% + '+dx+'px))';
    });

    document.addEventListener('pointerup', function(e){
      if(!active) return; active=false;
      var dx=e.clientX-sx;
      if(locked==='h' && Math.abs(dx)>40){
        goTo(cur+(dx<0?1:-1));
      } else {
        track.style.transition='';
        track.style.transform='translateX(-'+(cur*100)+'%)';
      }
    });

    document.addEventListener('visibilitychange', function(){
      if(document.hidden) clearTimeout(timer); else scheduleNext();
    });

    scheduleNext();
  })();

  /* ===== Why accordion ===== */
  (function(){
    document.querySelectorAll('.why-row').forEach(function(row){
      function toggle(){
        var isOpen = row.classList.contains('open');
        document.querySelectorAll('.why-row').forEach(function(r){
          r.classList.remove('open');
          r.setAttribute('aria-expanded','false');
        });
        if(!isOpen){ row.classList.add('open'); row.setAttribute('aria-expanded','true'); }
      }
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', function(e){
        if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); }
      });
    });
  })();

  /* ===== Infinite marquee — clona itens até cobrir 3× viewport, anima em px ===== */
  (function(){
    var GAP = 16, mqId = 0;
    document.querySelectorAll('.items-track').forEach(function(track){
      var isRev  = track.classList.contains('items-track--rev');
      var orig   = Array.from(track.children);
      var cardW  = orig[0] ? orig[0].offsetWidth : 210;
      var setW   = orig.length * (cardW + GAP); // inclui gap após cada item
      var target = window.innerWidth * 3.5;
      var sets   = 1;
      while(setW * sets < target) sets++;
      for(var s = 1; s < sets; s++){
        orig.forEach(function(el){
          var c = el.cloneNode(true);
          c.setAttribute('aria-hidden','true');
          c.setAttribute('tabindex','-1');
          track.appendChild(c);
        });
      }
      var id   = ++mqId;
      var name = 'mq' + id;
      var from = isRev ? (-setW + 'px') : '0px';
      var to   = isRev ? '0px' : (-setW + 'px');
      var st   = document.createElement('style');
      st.textContent = '@keyframes ' + name + '{from{transform:translateX(' + from + ')}to{transform:translateX(' + to + ')}}';
      document.head.appendChild(st);
      track.style.cssText += ';animation-name:' + name + ';animation-duration:' + (isRev ? 38 : 34) + 's;animation-timing-function:linear;animation-iteration-count:infinite';
    });
  })();

  /* ===== Offer countdown (deterministic — counts to a fixed moment, no reset) ===== */
  var cd = { d: document.getElementById('cd-d'), h: document.getElementById('cd-h'),
             m: document.getElementById('cd-m'), s: document.getElementById('cd-s') };
  if(cd.d){
    // Fixed target = end of the current ISO week (next Sunday 23:59:59 local). Stable across reloads.
    var now = new Date();
    var target = new Date(now);
    var daysToSunday = (7 - now.getDay()) % 7; if(daysToSunday === 0) daysToSunday = 7;
    target.setDate(now.getDate() + daysToSunday);
    target.setHours(23,59,59,0);
    function pad(n){ return (n<10?'0':'') + n; }
    function tick(){
      var diff = target.getTime() - Date.now();
      if(diff < 0) diff = 0;
      var s = Math.floor(diff/1000);
      cd.d.textContent = pad(Math.floor(s/86400));
      cd.h.textContent = pad(Math.floor((s%86400)/3600));
      cd.m.textContent = pad(Math.floor((s%3600)/60));
      cd.s.textContent = pad(s%60);
    }
    tick();
    setInterval(tick, 1000);
  }
})();
