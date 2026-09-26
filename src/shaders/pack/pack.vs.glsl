uniform vec2 uPS; uniform float uFlipU;
varying vec2 vUv; varying vec3 vPosV; varying vec3 vNrmV; varying vec3 vTanV; varying vec3 vBitV;
void main(){
  vUv = uv;
  vec2 g = vec2(uFlipU > .5 ? 1. - uv.x : uv.x, uv.y);
  vec3 pos = vec3(position.xy, puff(g));
  float e = .004;
  float dx = (puff(g + vec2(e, 0.)) - puff(g - vec2(e, 0.)))/(2.*e*uPS.x);
  float dy = (puff(g + vec2(0., e)) - puff(g - vec2(0., e)))/(2.*e*uPS.y);
  if (uFlipU > .5) dx = -dx;
  vec3 nL = normalize(vec3(-dx, -dy, 1.));
  vec4 mv = modelViewMatrix*vec4(pos, 1.);
  vPosV = mv.xyz;
  mat3 m3 = mat3(modelViewMatrix);
  vNrmV = normalize(m3*nL);
  vTanV = normalize(m3*vec3(1., 0., 0.));
  vBitV = normalize(m3*vec3(0., 1., 0.));
  gl_Position = projectionMatrix*mv;
}
