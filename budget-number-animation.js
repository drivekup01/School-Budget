/* Animate visible monetary values once, with exact final values and reduced-motion support. */
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),seen=new WeakSet(),active=new Map();
 const format=n=>n.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
 function finish(el,n){el.textContent=format(n);el.classList.remove('number-counting');active.delete(el)}
 function start(el){const target=Number(el.dataset.count);if(!Number.isFinite(target))return;if(reduced.matches||target===0){finish(el,target);return}const begun=performance.now();el.classList.add('number-counting');el.textContent=format(0);active.set(el,target);
  function step(now){if(!el.isConnected){active.delete(el);return}if(reduced.matches){finish(el,target);return}const progress=Math.min((now-begun)/1100,1),value=target*(1-Math.pow(1-progress,3));el.textContent=format(Math.round(value*100)/100);if(progress<1)requestAnimationFrame(step);else finish(el,target)}requestAnimationFrame(step);
 }
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);start(entry.target)}},{threshold:.15});
 function discover(root){if(root.nodeType!==1)return;const elements=[...(root.matches('[data-count]')?[root]:[]),...root.querySelectorAll('[data-count]')];for(const el of elements){if(seen.has(el))continue;seen.add(el);observer.observe(el)}}
 discover(document.body);new MutationObserver(records=>{for(const r of records){for(const node of r.addedNodes)discover(node);for(const node of r.removedNodes)if(node.nodeType===1){observer.unobserve(node);node.querySelectorAll('[data-count]').forEach(el=>observer.unobserve(el))}}}).observe(document.body,{childList:true,subtree:true});
})();
