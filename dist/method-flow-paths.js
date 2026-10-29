// Coordinates are measured on the unchanged website PNG, not the separate paper-source figure.
export const METHOD_IMAGE = {
  width: 2314,
  height: 1585,
  sha256: '3a3a2b04d4d001396ca93acd13f40ba0de7de0e18975bbe6ddf0878d709eba1e',
};

// Each centerline ends at the base of its existing arrowhead. The heads stay fixed in the PNG.
// The Benchmark trunk is drawn once, then splits into two branches without overlapping strokes.
export const METHOD_FLOWS = [
  {id:'calibration', group:'A', color:'#156082', d:'M386 314 H480'},
  {id:'offline-retargeting', group:'A', color:'#aa7b26', d:'M860 314 H938'},
  {id:'quality-check', group:'A', color:'#7f7f7f', d:'M1301 301 H1315'},
  {id:'curated-pairs', group:'A', color:'#7f7f7f', d:'M1502 336 V349'},
  {id:'reference-encoder', group:'B', color:'#156082', d:'M256 831 H346'},
  {id:'encoder-token', group:'B', color:'#7960af', d:'M539 828 H637'},
  {id:'token-decoder', group:'B', color:'#7960af', d:'M824 829 H1207'},
  {id:'token-reconstruction', group:'B', color:'#7960af', d:'M746 865 V884'},
  {id:'robot-reward', group:'B', color:'#aa7b26', d:'M1572 792 V673 H1551'},
  {id:'reward-decoder', group:'B', color:'#aa7b26', d:'M1299 732 V765'},
  {id:'decoder-robot', group:'B', color:'#4e887a', d:'M1395 862 H1506'},
  {id:'robot-state', group:'B', color:'#7f7f7f', d:'M1572 1020 V1050'},
  {id:'state-decoder', group:'B', color:'#747474', d:'M1427 1126 H1192 V899 H1207'},
  {id:'state-error', group:'B', color:'#747474', d:'M1542 1165 V1263 H1341'},
  {id:'error-decoder', group:'B', color:'#4e887a', d:'M1172 1213 V868 H1207'},
  {id:'selector-error', group:'B', color:'#4e887a', d:'M1068 1378 H1196 V1338'},
  {id:'reference-selector', group:'B', color:'#156082', d:'M204 996 V1406 H702'},
  {id:'reconstruction-selector', group:'B', color:'#7960af', d:'M523 1244 V1341 H702'},
  {id:'teleoperation-reference', group:'C', color:'#156082', d:'M1878 351 V405'},
  {id:'policy-reference', group:'C', color:'#156082', d:'M2099 396 V511 H1976'},
  {id:'policy-token', group:'C', color:'#7960af', d:'M2236 394 V706 H2082 V812'},
  {id:'deployment-reference-encoder', group:'C', color:'#156082', d:'M1878 620 V677'},
  {id:'deployment-encoder-token', group:'C', color:'#7960af', d:'M1882 840 V874 H1992'},
  {id:'deployment-token-decoder', group:'C', color:'#7960af', d:'M2082 910 V961'},
  {id:'deployment-error-decoder', group:'C', color:'#156082', d:'M1920 1057 H1960'},
  {id:'deployment-decoder-robot', group:'C', color:'#4e887a', d:'M2085 1115 V1166'},
  {id:'deployment-state-decoder', group:'C', color:'#4e887a', d:'M2177 1314 H2249 V1053 H2207'},
  {id:'deployment-state-error', group:'C', color:'#747474', d:'M1925 1314 H1828 V1133'},
  {id:'execution-benchmark', group:'benchmark', color:'#747474', d:'M2003 1453 V1524 H1701'},
  {id:'benchmark-trunk', group:'benchmark', color:'#747474', d:'M1021 1524 H6 V1015', arrowhead:false},
  {id:'benchmark-training', group:'benchmark', color:'#747474', d:'M6 1015 H20', continues:'benchmark-trunk'},
  {id:'benchmark-curation', group:'benchmark', color:'#747474', d:'M6 1015 V289 H20', continues:'benchmark-trunk'},
];
