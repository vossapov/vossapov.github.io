const videos=[...document.querySelectorAll('video')];
videos.forEach(video=>{
 const button=document.querySelector(`[data-video="${video.id}"]`);
 button.addEventListener('click',()=>video.play().catch(()=>{button.textContent='Натисніть ▶ у плеєрі'}));
 video.addEventListener('play',()=>{button.hidden=true;videos.forEach(other=>{if(other!==video)other.pause()})});
 video.addEventListener('ended',()=>{button.hidden=false});
});
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)entry.target.pause()}),{threshold:.15});
videos.forEach(video=>observer.observe(video));
