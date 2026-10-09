const videos=[...document.querySelectorAll('video')];
const time=t=>`${Math.floor((t||0)/60)}:${String(Math.floor((t||0)%60)).padStart(2,'0')}`;
videos.forEach(video=>{
 const button=document.querySelector(`[data-video="${video.id}"]`),controls=document.querySelector(`[data-controls="${video.id}"]`),toggle=controls.querySelector('.control-toggle'),range=controls.querySelector('input'),clock=controls.querySelector('.video-time'),caption=document.querySelector(`[data-caption="${video.id}"]`),title=caption.textContent;
 const play=()=>video.play().catch(()=>{caption.textContent='Не вдалося відкрити відео. Спробуйте ще раз.'});
 const switchPlay=()=>video.paused?play():video.pause();
 button.addEventListener('click',play);toggle.addEventListener('click',switchPlay);video.addEventListener('click',switchPlay);
 video.addEventListener('play',()=>{button.hidden=true;toggle.textContent='Ⅱ';toggle.setAttribute('aria-label',`Пауза: ${title}`);videos.forEach(other=>{if(other!==video)other.pause()})});
 video.addEventListener('pause',()=>{button.hidden=false;toggle.textContent='▶';toggle.setAttribute('aria-label',`Відтворити: ${title}`)});
 const update=()=>{if(Number.isFinite(video.duration)){range.value=video.currentTime/video.duration*100;clock.textContent=`${time(video.currentTime)} / ${time(video.duration)}`}};
 video.addEventListener('timeupdate',update);video.addEventListener('loadedmetadata',update);
 range.addEventListener('input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number(range.value)/100*video.duration});
 controls.querySelector('.control-full').addEventListener('click',()=>{if(video.requestFullscreen)video.requestFullscreen().catch(()=>{});else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen()});
 if(video.textTracks[0]){const track=video.textTracks[0];track.mode='hidden';track.addEventListener('cuechange',()=>{caption.textContent=track.activeCues?.[0]?.text.replace(/^\d+\s+/,'')||title})}
});
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)entry.target.pause()}),{threshold:.15});videos.forEach(video=>observer.observe(video));
