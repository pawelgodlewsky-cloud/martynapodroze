const photos = new Set(['colosseum','palatine','forum','campidoglio','st-peter-square','st-peter','vatican-museums','spanish-steps']);
const motifs = {
  arch:'<path d="M175 235V95h250v140h-55v-95q-35-55-70 0v95h-35v-65q-22-35-45 0v65z"/><path d="M175 110h250M190 80h220M200 125v105M405 125v105"/>',
  temple:'<path d="M140 120l160-70 160 70zM150 230h300M135 245h330"/><path d="M170 125v105m52-105v105m52-105v105m52-105v105m52-105v105m52-105v105" stroke-width="14"/>',
  dome:'<path d="M145 235V145h310v90M210 145a90 90 0 01180 0M300 55V30m-15 12h30M160 165h280M275 235v-48q25-30 50 0v48M180 190v30m45-30v30m150-30v30m45-30v30"/>',
  bridge:'<path d="M100 145h400v65h-45q-20-80-65 0h-40q-50-80-100 0h-40q-45-80-65 0h-45zM90 230q60-20 120 0t120 0t120 0t60 0M140 145v-30m80 30v-30m80 30v-30m80 30v-30m80 30v-30"/>',
  fountain:'<path d="M160 220q140 70 280 0zM210 170q90 70 180 0zM280 210v-55h40v55M300 165V90m-70 70q0-70 70-70t70 70M185 220q0-100 95-85m135 85q0-100-95-85"/>',
  palace:'<path d="M140 240V85h320v155M125 85h350M155 70h290M280 240v-45q20-30 40 0v45"/><path d="M170 110h25v25h-25zm65 0h25v25h-25zm105 0h25v25h-25zm65 0h25v25h-25zM170 175h25v25h-25zm65 0h25v25h-25zm105 0h25v25h-25zm65 0h25v25h-25z"/>',
  park:'<path d="M160 240V120m135 120V100m140 140V125M110 250h380"/><path d="M95 130q-20-75 65-75t65 75zM220 110q-20-80 75-80t75 80zM380 135q-15-65 55-65t55 65z"/>',
  road:'<path d="M150 255L275 75h50l125 180M300 85v170M225 145h150M195 190h210M170 225h260M130 150V70m340 80V70"/><path d="M90 80q-10-50 40-50t40 50zM430 80q-10-50 40-50t40 50z"/>',
  tower:'<path d="M185 240V90h70v150m90 0V90h70v150M175 90V65h90v25m70 0V65h90v25M255 130h90v110h-15v-55q-30-40-60 0v55h-15M210 110v25m160-25v25"/>',
  tomb:'<path d="M190 235V110q110-50 220 0v125zM190 125q110 45 220 0M210 95V65h25v25h30V65h30v25h30V65h30v25h30V65h25v45M280 235v-55h40v55"/>',
  ruins:'<path d="M120 240h350M160 235V90h35v145m55 0V65h35v170m55 0V110h35v125M145 90h65M235 65h65M325 110h65M135 70h75l75-25h30M410 235V150h55v85"/>',
  street:'<path d="M100 245V80h115v165m170 0V55h115v190M215 245l70-90h40l60 90M130 110h25v30h-25zm0 65h25v30h-25zM420 90h25v30h-25zm0 65h25v30h-25zM260 95q40 50 80 0"/>',
  view:'<path d="M80 225h440M100 225v40m80-40v40m80-40v40m80-40v40m80-40v40m80-40v40M120 200v-60h70v60m35 0v-90h55v90m35 0v-60h80v60m25 0v-115h45v115M315 140q40-80 80 0M95 265h410"/>',
  island:'<path d="M215 100q100-60 170 50t-70 75t-100-125zM80 125h150m155 70h135M80 85q55-25 110 0m210 10q55-25 110 0M85 255q60-25 120 0M280 190v-65h50v65"/>',
  underground:'<path d="M110 75h380M150 75v175h300V75M185 110h75v45h-75zm155 0h75v45h-75zM185 185h75v45h-75zm155 0h75v45h-75zM285 250V100h30v150"/>',
  water:'<path d="M220 240h160M260 240V140h80v100M275 140V95h80v30h-35M350 140q-30 45 0 45t0-45M235 255h130"/>',
  toilet:'<path d="M210 240V70h180v170M230 240V95h60v145m20 0V95h60v145M248 140h25m-12-15v30M327 140h25"/>'
};
const types = {'arch-constantine':'arch','fori-imperiali':'ruins','forum-view':'view','piazza-venezia':'palace','vittoriano':'temple','castel-santangelo':'tomb','ponte-santangelo':'bridge','piazza-navona':'fountain','pantheon':'temple','trevi':'fountain','via-del-corso':'street','campo-fiori':'street','torre-argentina':'ruins','jewish-ghetto':'street','tiber-island':'island','trastevere':'street','santa-maria-trastevere':'dome','gianicolo':'view','borghese-gallery':'palace','villa-borghese':'park','pincio':'view','popolo':'dome','porta-san-sebastiano':'tower','appia-antica':'road','catacombs-callisto':'underground','cecilia-metella':'tomb','capitoline-museums':'palace','doria-pamphilj':'palace','santa-maria-aracoeli':'dome','baths-caracalla':'ruins','water-colosseum':'water','toilet-sonnino':'toilet'};
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function placeVisual(item) {
  if(photos.has(item.id)) return `<img src="assets/places/${item.id}.jpg" alt="${esc(item.id==='campidoglio'?'Wilczyca Kapitolińska przy Piazza del Campidoglio':item.id==='vatican-museums'?'Galeria Map w Muzeach Watykańskich':item.name)}" loading="lazy" decoding="async"><small class="visual-caption">Zdjęcie z podróży</small>`;
  return `<svg viewBox="0 0 600 300" role="img" aria-label="${esc(item.name)} — ilustracja symboliczna"><rect width="600" height="300" fill="#e9eddf"/><circle cx="460" cy="65" r="28" fill="#e4ee91"/><g fill="#d2dbbd" stroke="#36564a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${motifs[types[item.id]]||motifs.view}</g></svg><small class="visual-caption">${esc(item.name)} · ilustracja symboliczna</small>`;
}
