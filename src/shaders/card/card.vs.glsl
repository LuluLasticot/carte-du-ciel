varying vec2 vUv; varying vec3 vPosV; varying vec3 vNrmV; varying vec3 vTanV; varying vec3 vBitV;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix*vec4(position, 1.);
  vPosV = mv.xyz;
  mat3 m3 = mat3(modelViewMatrix);
  vNrmV = normalize(m3*vec3(0., 0., 1.));
  vTanV = normalize(m3*vec3(1., 0., 0.));
  vBitV = normalize(m3*vec3(0., 1., 0.));
  gl_Position = projectionMatrix*mv;
}
