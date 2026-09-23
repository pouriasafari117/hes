/* تبدیل تاریخ جلالی ↔ میلادی — همان پیاده‌سازی اثبات‌شدهٔ panel.js (سمت سرور) */
function jdiv(a,b){ return ~~(a/b); }
function jmod(a,b){ return a - ~~(a/b)*b; }

const J_BREAKS = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
function jalCal(jy){
  const bl = J_BREAKS.length; let gy = jy + 621, leapJ = -14, jp = J_BREAKS[0], jm, jump;
  for(let i=1;i<bl;i++){
    jm = J_BREAKS[i]; jump = jm - jp;
    if(jy < jm) break;
    leapJ += jdiv(jump,33)*8 + jdiv(jmod(jump,33),4);
    jp = jm;
  }
  const n = jy - jp;
  leapJ += jdiv(n,33)*8 + jdiv(jmod(n,33)+3,4);
  if(jmod(jump,33)===4 && jump-n===4) leapJ += 1;
  const leapG = jdiv(gy,4) - jdiv((jdiv(gy,100)+1)*3,4) - 150;
  const march = 20 + leapJ - leapG;
  let n2 = n; if(jump-n < 6) n2 = n - jump + jdiv(jump+4,33)*33;
  let leap = jmod(jmod(n2+1,33)-1,4); if(leap===-1) leap = 4;
  return {leap, gy, march};
}
function g2d(gy,gm,gd){
  let d = jdiv((gy + jdiv(gm-8,6) + 100100)*1461,4) + jdiv(153*jmod(gm+9,12)+2,5) + gd - 34840408;
  d = d - jdiv(jdiv(gy+100100+jdiv(gm-8,6),100)*3,4) + 752;
  return d;
}
function d2g(jdn){
  let j = 4*jdn + 139361631;
  j = j + jdiv(jdiv(4*jdn+183187720,146097)*3,4)*4 - 3908;
  const i = jdiv(jmod(j,1461),4)*5 + 308;
  const gd = jdiv(jmod(i,153),5)+1, gm = jmod(jdiv(i,153),12)+1, gy = jdiv(j,1461)-100100+jdiv(8-gm,6);
  return {gy,gm,gd};
}
function j2d(jy,jm,jd){ const r = jalCal(jy); return g2d(r.gy,3,r.march) + (jm-1)*31 - jdiv(jm,7)*(jm-7) + jd - 1; }
function d2j(jdn){
  const gy = d2g(jdn).gy; let jy = gy - 621;
  const r = jalCal(jy), jdn1f = g2d(gy,3,r.march);
  let k = jdn - jdn1f, jd, jm;
  if(k >= 0){ if(k <= 185){ return {jy, jm:1+jdiv(k,31), jd:jmod(k,31)+1}; } k -= 186; }
  else { jy -= 1; k += 179; if(r.leap===1) k += 1; }
  jm = 7 + jdiv(k,30); jd = jmod(k,30)+1;
  return {jy,jm,jd};
}

function g2j(gy,gm,gd){ return d2j(g2d(gy,gm,gd)); }
function j2g(jy,jm,jd){ return d2g(j2d(jy,jm,jd)); }
/* ماه میلادی 'YYYY-MM' → کلید ماه جلالی (jy*12+jm) بر اساس روز پانزدهم ماه */
function gregYmToJKey(ym){
  const j = g2j(Number(ym.slice(0,4)), Number(ym.slice(5,7)), 15);
  return j.jy*12 + j.jm;
}
function todayJKey(){
  const n = new Date();
  const j = g2j(n.getFullYear(), n.getMonth()+1, n.getDate());
  return j.jy*12 + j.jm;
}
function jKeyToYJm(key){ const jm = ((key-1)%12)+1; return { jy:(key-jm)/12, jm }; }

module.exports = { g2j, j2g, gregYmToJKey, todayJKey, jKeyToYJm };
