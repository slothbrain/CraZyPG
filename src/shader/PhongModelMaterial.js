import { Shader } from './Shader';
import { Material } from './Material';
import vs from './shadersrc/phong.vs.glsl';
import fs from './shadersrc/phong.fs.glsl';

function PhongModelShader() {

    Shader.call( this, vs, fs, { useLight: true } );

}

PhongModelShader.prototype = Object.assign( Object.create( Shader.prototype ), {

    constructor: PhongModelShader,

} );

// {}
function PhongModelMaterial( opts = {} ) {

    const defaultOpt = { name: 'PhongModelMaterial' };
    const opt = Object.assign( defaultOpt, opts );
    Material.call( this, PhongModelShader, opt );

    const {
        baseTexture, specular, shininess, emissive, emissiveTexture,
        specularTexture, normalTexture, normalScale, bumpTexture, bumpScale,
        aoIntensity, aoTexture,
    } = opt;
    this.baseTexture = baseTexture;
    this.specular = specular || [ 1, 1, 1 ];
    this.shininess = shininess || 10;
    this.emissive = emissive || [ 0, 0, 0 ];
    this.emissiveTexture = emissiveTexture;
    this.specularTexture = specularTexture;
    this.normalTexture = normalTexture;
    this.normalScale = normalScale || [ 1, 1 ];
    this.bumpTexture = bumpTexture;
    this.bumpScale = bumpScale || 1;
    this.aoIntensity = aoIntensity || 1;
    this.aoTexture = aoTexture;

}

PhongModelMaterial.prototype = Object.assign( Object.create( Material.prototype ), {

    constructor: PhongModelMaterial,

} );

Object.defineProperties( PhongModelMaterial.prototype, {

    baseTexture: {

        get() {

            return this._baseTexture;

        },

        set( v ) {

            this._baseTexture = v;
            this.setUniformObj( { u_baseTexture: v } );

        },

    },

    emissive: {

        get() {

            return this._emissive;

        },

        set( v ) {

            this._emissive = v;
            this.setUniformObj( { u_emissive: v } );

        },

    },

    emissiveTexture: {

        get() {

            return this._emissiveTexture;

        },

        set( v ) {

            this._emissiveTexture = v;
            this.setUniformObj( { u_emissiveTexture: v } );

        },

    },

    specularTexture: {

        get() {

            return this._specularTexture;

        },

        set( v ) {

            this._specularTexture = v;
            this.setUniformObj( { u_specularTexture: v } );

        },

    },

    specular: {

        get() {

            return this._specular;

        },

        set( v ) {

            this._specular = v;
            this.setUniformObj( { u_specular: v } );

        },

    },

    shininess: {

        get() {

            return this._shininess;

        },

        set( v ) {

            this._shininess = v;
            this.setUniformObj( { u_shininess: v } );

        },

    },

    normalTexture: {

        get() {

            return this._normalTexture;

        },

        set( v ) {

            this._normalTexture = v;
            this.setUniformObj( { u_normalTexture: v } );

        },

    },

    normalScale: {

        get() {

            return this._normalScale;

        },

        set( v ) {

            this._normalScale = v;
            this.setUniformObj( { u_normalScale: v } );

        },

    },

    bumpTexture: {

        get() {

            return this._bumpTexture;

        },

        set( v ) {

            this._bumpTexture = v;
            this.setUniformObj( { u_bumpTexture: v } );

        },

    },

    bumpScale: {

        get() {

            return this._bumpScale;

        },

        set( v ) {

            this._bumpScale = v;
            this.setUniformObj( { u_bumpScale: v } );

        },

    },

    aoIntensity: {

        get() {

            return this._aoIntensity;

        },

        set( v ) {

            this._aoIntensity = v;
            this.setUniformObj( { u_aoIntensity: v } );

        },

    },

    aoTexture: {

        get() {

            return this._aoTexture;

        },

        set( v ) {

            this._aoTexture = v;
            this.setUniformObj( { u_aoTexture: v } );

        },

    },

} );

export { PhongModelMaterial };
