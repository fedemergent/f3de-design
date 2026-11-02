/* franjas: comportamiento de las plantillas (no editar a mano) */
(function(){
var $=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('fr-in');io.unobserve(e.target)}})},{threshold:.12}):null;
$('.fr-rv').forEach(function(el){io?io.observe(el):el.classList.add('fr-in')});
var lb=document.createElement('div');lb.className='fr-lb';lb.innerHTML='<img alt="">';document.body.appendChild(lb);
lb.addEventListener('click',function(){lb.classList.remove('on')});
document.addEventListener('keydown',function(e){if(e.key==='Escape')lb.classList.remove('on')});
$('.fr-fig[data-zoom]').forEach(function(f){f.addEventListener('click',function(){var i=f.querySelector('img');if(i){lb.firstChild.src=i.currentSrc||i.src;lb.classList.add('on')}})});
$('.fr-strip').forEach(function(s){var t=s.querySelector('.fr-track');
 s.querySelector('.fr-prev').onclick=function(){t.scrollBy({left:-t.clientWidth*.8,behavior:'smooth'})};
 s.querySelector('.fr-next').onclick=function(){t.scrollBy({left:t.clientWidth*.8,behavior:'smooth'})}});
$('.fr-slider').forEach(function(s){var f=$('.fr-fig',s),d=s.querySelector('.fr-dots'),n=0,timer;
 f.forEach(function(_,i){var b=document.createElement('i');b.onclick=function(){go(i,1)};d.appendChild(b)});
 function go(i,man){n=(i+f.length)%f.length;f.forEach(function(x,k){x.classList.toggle('on',k===n)});$('i',d).forEach(function(x,k){x.classList.toggle('on',k===n)});if(man)restart()}
 function restart(){clearInterval(timer);var a=+s.dataset.auto;if(a)timer=setInterval(function(){go(n+1)},a*1000)}
 s.querySelector('.fr-prev').onclick=function(){go(n-1,1)};s.querySelector('.fr-next').onclick=function(){go(n+1,1)};go(0);restart()});
$('.fr-show').forEach(function(s){var m=s.querySelector('.fr-main'),t=$('.fr-thumbs .fr-fig',s);
 t.forEach(function(x){x.onclick=function(){m.classList.remove('play');if(x.dataset.vsrc){m.classList.add('fr-v');m.removeAttribute('data-zoom');m.innerHTML='<video controls autoplay muted loop playsinline src="'+x.dataset.vsrc+'"></video>'}else{m.classList.remove('fr-v');m.setAttribute('data-zoom','');m.innerHTML='<img src="'+x.dataset.big+'" alt="">'}t.forEach(function(y){y.classList.toggle('on',y===x)})}});if(t[0])t[0].classList.add('on')});
$('.fr-fig.fr-v').forEach(function(f){var v=f.querySelector('video');if(!v||v.controls)return;f.addEventListener('click',function(){if(v.paused){v.play();f.classList.add('play')}else{v.pause();f.classList.remove('play')}})});
$('.fr-ring').forEach(function(r){var rot=r.querySelector('.fr-rot'),f=$('.fr-fig',rot),n=f.length,a=0,w=rot.clientWidth||280,R=Math.round(w/2/Math.tan(Math.PI/n))+30;
 function lay(){w=rot.clientWidth||280;R=Math.round(w/2/Math.tan(Math.PI/n))+30;f.forEach(function(x,i){x.style.transform='rotateY('+(360/n*i)+'deg) translateZ('+R+'px)'});rot.style.transform='translateZ(-'+R+'px) rotateY('+a+'deg)'}
 function turn(d){a+=d*360/n;rot.style.transform='translateZ(-'+R+'px) rotateY('+a+'deg)'}
 r.querySelector('.fr-prev').onclick=function(){turn(1)};r.querySelector('.fr-next').onclick=function(){turn(-1)};
 lay();window.addEventListener('resize',lay);var tm=setInterval(function(){if(!r.matches(':hover'))turn(-1)},4200)});
$('.fr-vcard').forEach(function(c){c.addEventListener('click',function(){var v=c.querySelector('video');if(v.paused){$('.fr-vcard video').forEach(function(o){if(o!==v){o.pause();o.parentNode.classList.remove('play')}});v.play();c.classList.add('play')}else{v.pause();c.classList.remove('play')}})});
$('.fr-chan').forEach(function(c){var v=c.querySelector('video'),l=$('.fr-vlist .fr-fig',c);
 l.forEach(function(x){x.onclick=function(){v.src=x.dataset.src;v.poster=x.dataset.poster;v.load();v.play().catch(function(){});l.forEach(function(y){y.classList.toggle('on',y===x)})}});if(l[0])l[0].classList.add('on')});
})();
