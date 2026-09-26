uniform float uTearOn; uniform float uFront; uniform float uDir; uniform float uTearV[65];
float tearBase(float u){ float x = clamp(u, 0., 1.)*64.; float i = floor(x); int ii = int(i); return mix(uTearV[ii], uTearV[min(ii + 1, 64)], x - i); }
float tearLine(float u){
  return tearBase(u) + .0055*(vnoise(vec2(u*36., 1.3)) - .5) + .0032*(vnoise(vec2(u*130., 4.1)) - .5) + .0016*(vnoise(vec2(u*380., 7.)) - .5);
}
float tornAt(float u){ return uTearOn < .5 ? 0. : (uDir > 0. ? step(u, uFront) : step(uFront, u)); }
float puff(vec2 uv){
  float ex = abs(uv.x*2. - 1.);
  float sx = 1. - pow(ex, 5.);
  float sealB = smoothstep(.05, .13, uv.y);
  float sealT = smoothstep(.955, .87, uv.y);
  float sy = clamp(1. - pow(abs((uv.y - .5)/.46), 3.), 0., 1.);
  return .003 + .028*(1. - pow(ex, 10.))*sealB*sealT + .15*sx*sy*sealB*sealT;
}
