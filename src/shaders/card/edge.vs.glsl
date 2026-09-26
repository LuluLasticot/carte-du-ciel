varying vec3 vPosV; varying vec3 vNrmV;
void main(){
  vec4 mv = modelViewMatrix*vec4(position, 1.);
  vPosV = mv.xyz;
  vNrmV = normalize(normalMatrix*normal);
  gl_Position = projectionMatrix*mv;
}
