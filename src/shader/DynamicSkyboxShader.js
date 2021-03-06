import { Shader } from './Shader';
import vs from './shadersrc/skybox.vs.glsl';
import fs from './shadersrc/skybox.fs.glsl';

function DynamicSkyboxShader( gl, dayTex, nightTex = dayTex, rate = 0.5 ) {

    Shader.call( this, gl, DynamicSkyboxShader.vs, DynamicSkyboxShader.fs );

    this.setUniformObj( { u_dayTex: dayTex, u_nightTex: nightTex, u_rate: rate } );

    this.deactivate();

}

DynamicSkyboxShader.prototype = Object.assign( Object.create( Shader.prototype ), {

    constructor: DynamicSkyboxShader,

    setRate( r ) {

        this.setUniformObj( { u_rate: r } );
        return this;

    },

    setTexture( dayTex, nightTex = dayTex ) {

        this.setUniformObj( { u_dayTex: dayTex, u_nightTex: nightTex } );
        return this;

    },

    updateCamera() {

        this.setProjMatrix( this.camera.projMat );
        this.setViewMatrix( this.camera.getOrientMatrix() );
        return this;

    },

} );

Object.assign( DynamicSkyboxShader, {

    vs,
    fs,

} );

export { DynamicSkyboxShader };
