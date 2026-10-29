// Exact paper main@7bdfcc7 PNG. Geometry is measured in its native image pixels.
export const METHOD_IMAGE = {
  width: 2273,
  height: 1462,
  sha256: 'aa8008e9762172bbe90088b4bd58bddbfb8696f6a047e2847633adfd8d366cf7',
};

// Each centerline ends at the base of its existing arrowhead. The heads stay fixed in the PNG.
// Benchmark was removed in this paper revision; only the 28 real A/B/C arrows remain.
export const METHOD_FLOWS = [
  {id:'calibration', group:'A', color:'#156082', d:'M345 313.5 H439'},
  {id:'offline-retargeting', group:'A', color:'#aa7b26', d:'M819 314 H897'},
  {id:'quality-check', group:'A', color:'#7f7f7f', d:'M1259 301.5 H1274'},
  {id:'curated-pairs', group:'A', color:'#7f7f7f', d:'M1461.5 334 V349'},
  {id:'reference-encoder', group:'B', color:'#156082', d:'M215 830.5 H305'},
  {id:'encoder-token', group:'B', color:'#7960af', d:'M497 827.5 H596'},
  {id:'token-decoder', group:'B', color:'#7960af', d:'M784 828.5 H1166'},
  {id:'token-reconstruction', group:'B', color:'#7960af', d:'M704.5 865 V884'},
  {id:'robot-reward', group:'B', color:'#aa7b26', d:'M1529.5 791 V673.5 H1510'},
  {id:'reward-decoder', group:'B', color:'#aa7b26', d:'M1257 733 V765'},
  {id:'decoder-robot', group:'B', color:'#4e887a', d:'M1354 862.5 H1465'},
  {id:'robot-state', group:'B', color:'#7f7f7f', d:'M1530 1019 V1050'},
  {id:'state-decoder', group:'B', color:'#747474', d:'M1388 1126 H1150.5 V899.5 H1166'},
  {id:'state-error', group:'B', color:'#747474', d:'M1499.5 1165 V1262 H1300'},
  {id:'error-decoder', group:'B', color:'#4e887a', d:'M1130 1213 V867 H1166'},
  {id:'selector-error', group:'B', color:'#4e887a', d:'M1027 1377.5 H1154.5 V1338'},
  {id:'reference-selector', group:'B', color:'#156082', d:'M162.5 997 V1405.5 H661'},
  {id:'reconstruction-selector', group:'B', color:'#7960af', d:'M481.5 1245 V1340.5 H661'},
  {id:'teleoperation-reference', group:'C', color:'#156082', d:'M1837 352 V405'},
  {id:'policy-reference', group:'C', color:'#156082', d:'M2057 395 V510.5 H1935'},
  {id:'policy-token', group:'C', color:'#7960af', d:'M2193.5 394 V705 H2041 V812'},
  {id:'deployment-reference-encoder', group:'C', color:'#156082', d:'M1837 621 V677'},
  {id:'deployment-encoder-token', group:'C', color:'#7960af', d:'M1840.5 840 V873.5 H1951'},
  {id:'deployment-token-decoder', group:'C', color:'#7960af', d:'M2041 910 V961'},
  {id:'deployment-error-decoder', group:'C', color:'#4e887a', d:'M1879 1056.5 H1919'},
  {id:'deployment-decoder-robot', group:'C', color:'#4e887a', d:'M2044 1115 V1166'},
  {id:'deployment-state-decoder', group:'C', color:'#747474', d:'M2136 1313.5 H2207.5 V1052.5 H2166'},
  {id:'deployment-state-error', group:'C', color:'#747474', d:'M1882 1313.5 H1787.5 V1133'},
];
