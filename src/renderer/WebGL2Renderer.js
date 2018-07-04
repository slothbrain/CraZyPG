import { States } from './States';
import { BufferInfos } from './BufferInfos';
import { Textures } from './Textures';
import { Programs, setUniforms } from './Programs';
import { VertexArrays } from './VertexArrays';
import { DefaultColor, ShaderParams } from '../core/constant';
import { Matrix4 } from '../math/Matrix4';
import { pick } from '../core/utils';
import { RenderList } from './RenderList';
import { ShaderFactory } from '../shader/ShaderFactory';

const shaders = new Map();

const enableMap = {

    blend: 'BLEND',
    cull: 'CULL_FACE',
    depth: 'DEPTH_TEST',
    polygon: 'POLYGON_OFFSET_FILL',
    sampleBlend: 'SAMPLE_ALPHA_TO_COVERAGE',

};

const materialFuncs = [
    'blendColor', 'blendEquationSeparate', 'blendFuncSeparate',
    'colorMask', 'cullFace', 'depthFunc', 'depthMask', 'depthRange',
    'frontFace', 'lineWidth', 'polygonOffset',
];

function getContext( canvasOrId, opts = {} ) {

    let canvas;
    if ( typeof canvasOrId === 'string' )
        canvas = document.getElementById( canvasOrId );
    else if ( canvasOrId instanceof HTMLCanvasElement )
        canvas = canvasOrId;
    else
        throw TypeError( 'renderer expect a Canvas or Canvas\' ID' );

    const names = [ 'webgl2', 'experimental-webgl2' ];
    let context = null;
    for ( let i = 0; i < names.length; i ++ ) {

        context = canvas.getContext( names[ i ], opts );
        if ( context ) {

            console.log( `renderer: ${context.getParameter( context.VERSION ) || names[ i ]}` );
            break;

        }

    }

    if ( ! context )
        throw new Error( 'Please use a browser support WebGL 2.0 (like Chrome), this browser not support WebGL2Context.' );

    return context;

}

function resizeCanvasToDisplaySize( canvas, multiplier ) {

    let mult = multiplier || 1;
    mult = Math.max( 0, mult );
    const width = canvas.clientWidth * mult | 0;
    const height = canvas.clientHeight * mult | 0;
    if ( canvas.width !== width || canvas.height !== height ) {

        canvas.width = width; // eslint-disable-line
        canvas.height = height; // eslint-disable-line
        return true;

    }
    return false;

}

function clear(
    gl,
    r = DefaultColor.BackgroundNormalized[ 0 ],
    g = DefaultColor.BackgroundNormalized[ 1 ],
    b = DefaultColor.BackgroundNormalized[ 2 ],
    a = DefaultColor.BackgroundNormalized[ 3 ],
) {

    gl.clearColor( r, g, b, a );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

}

function WebGL2Renderer( canvasOrId, opts = {} ) {

    this.context = getContext( canvasOrId, opts );
    this.canvas = this.context.canvas;
    this.multiplier = 1.0;

    this.states = new States( this.context );
    this.buffers = new BufferInfos( this.context );
    this.textures = new Textures( this.context );
    this.programs = new Programs( this.context, this.buffers );
    this.vaos = new VertexArrays( this.context, this.programs, this.buffers );

    this.renderList = new RenderList();

    this.logDepth = !! opts.logDepth;
    this._uniformObj = {};

}

let lasProgram;

Object.assign( WebGL2Renderer.prototype, {

    clear( ...args ) {

        if ( Array.isArray( args[ 0 ] ) )
            clear( this.context, ...args[ 0 ] );
        else
            clear( this.context, ...args );

        return this;

    },

    setSize( width, height ) {

        this.canvas.style.width = width;
        this.canvas.style.height = height;
        resizeCanvasToDisplaySize( this.canvas, this.multiplier );
        this.context.viewport( 0, 0, this.canvas.width, this.canvas.height );
        return this;

    },

    fixCanvasToDisplay( multiplier, updateViewport = true ) {

        if ( typeof multiplier === 'number' && multiplier > 0 && this.multiplier !== multiplier )
            this.multiplier = multiplier;

        if ( resizeCanvasToDisplaySize( this.canvas, this.multiplier ) ) {

            if ( updateViewport )
                this.context.viewport( 0, 0, this.canvas.width, this.canvas.height );
            return true;

        }

        return false;

    },

    applyStates( material ) {

        Object.keys( enableMap ).forEach( ( key ) => {

            if ( material[ key ] )
                this.context.enable( this.context[ enableMap[ key ] ] );
            else
                this.context.disable( this.context[ enableMap[ key ] ] );

        } );

        materialFuncs.forEach( func => this.context[ func ]( ...material[ func ] ) );

    },

    updateUniforms( programInfo, material, camera, model, lightManager, fog ) {

        const uniformSetters = programInfo.uniformSetters;
        Object.keys( uniformSetters ).forEach( ( uniform ) => {

            switch ( uniform ) {

            case ShaderParams.UNIFORM_MV_MAT_NAME:
                if ( ! material.uniformObj[ ShaderParams.UNIFORM_MV_MAT_NAME ] ) {

                    const mvMat = {};
                    mvMat[ ShaderParams.UNIFORM_MV_MAT_NAME ] = Matrix4.identity();
                    material.setUniformObj( mvMat );

                }
                Matrix4.mult(
                    material.uniformObj[ ShaderParams.UNIFORM_MV_MAT_NAME ],
                    camera.uniformObj[ ShaderParams.UNIFORM_VIEW_MAT_NAME ],
                    model.uniformObj[ ShaderParams.UNIFORM_Model_MAT_NAME ],
                );
                break;

            case ShaderParams.UNIFORM_MVP_MAT_NAME:
                if ( ! material.uniformObj[ ShaderParams.UNIFORM_MVP_MAT_NAME ] ) {

                    const mvpMat = {};
                    mvpMat[ ShaderParams.UNIFORM_MVP_MAT_NAME ] = Matrix4.identity();
                    material.setUniformObj( mvpMat );

                }
                Matrix4.mult(
                    material.uniformObj[ ShaderParams.UNIFORM_MVP_MAT_NAME ],
                    camera.uniformObj[ ShaderParams.UNIFORM_PROJ_MAT_NAME ],
                    camera.uniformObj[ ShaderParams.UNIFORM_VIEW_MAT_NAME ],
                );
                Matrix4.mult(
                    material.uniformObj[ ShaderParams.UNIFORM_MVP_MAT_NAME ],
                    material.uniformObj[ ShaderParams.UNIFORM_MVP_MAT_NAME ],
                    model.uniformObj[ ShaderParams.UNIFORM_Model_MAT_NAME ],
                );
                break;

            default:
                break;

            }

        } );

        const usedUniforms = Object.keys( uniformSetters );
        programInfo.setUniformObj( pick( material.uniformObj, usedUniforms ) )
            .setUniformObj( pick( camera.uniformObj, usedUniforms ) )
            .setUniformObj( pick( model.uniformObj, usedUniforms ) )
            .setUniformObj( pick( lightManager.uniformObj, usedUniforms ) )
            .setUniformObj( pick( this.uniformObj, usedUniforms ) );

        if ( fog )
            programInfo.setUniformObj( pick( fog.uniformObj, usedUniforms ) );

        const updatedUniforms = programInfo.uniformObj;
        Object.keys( updatedUniforms ).forEach( ( uniformName ) => {

            const textureInfo = updatedUniforms[ uniformName ].textureInfo;
            if ( textureInfo )
                updatedUniforms[ uniformName ] = this.textures.update( textureInfo ).get( textureInfo );

        } );

        if ( lasProgram !== programInfo )
            Object.keys( programInfo.currentUniformObj ).forEach( ( prop ) => {

                const textureInfo = programInfo.currentUniformObj[ prop ].textureInfo;
                if ( textureInfo )
                    updatedUniforms[ prop ] = this.textures.update( textureInfo ).get( textureInfo );

            } );

        setUniforms( uniformSetters, updatedUniforms );
        programInfo.afterUpdateUniform();

    },

    preRender( models, lightManager, fog ) {

        this.renderList.clear();

        const lightDefine = ShaderFactory.parseDefineObjFromLightManager( lightManager );
        const fogDefine = ShaderFactory.parseDefineObjFromFog( fog );
        const rendererDefine = ShaderFactory.parseDefineObjFromRenderer( this );

        models.forEach( ( model ) => {

            const { material, primitive } = model;

            let shader;
            if ( shaders.has( material.ShaderType ) )
                shader = shaders.get( material.ShaderType );
            else {

                shader = new material.ShaderType();
                shaders.set( material.ShaderType, shader );

            }

            const programInfo = shader.getProgramInfo( primitive, material, lightDefine, fogDefine, rendererDefine );
            const { vaoInfo } = primitive;

            primitive.updateVaoInfo( programInfo );
            this.programs.update( programInfo );
            this.vaos.update( vaoInfo );

            const vao = this.vaos.get( vaoInfo );
            const program = this.programs.get( programInfo );

            this.renderList.add( {
                model,
                id: model.id,
                material,
                primitive,
                vao,
                program,
                transparent: false,
                programInfo,
            } );

        } );

        this.renderList.sort();

    },

    renderModel( camera, lightManager, fog ) {

        if ( this.logDepth )
            this._uniformObj.u_logDepthBufFC = 2.0 / ( Math.log( camera.far + 1.0 ) / Math.LN2 );

        const opqueTargets = this.renderList.opqueList;

        opqueTargets.forEach( ( opque ) => {

            const {
                model, primitive, material, program, vao, programInfo,
            } = opque;

            this.context.useProgram( program );
            this.applyStates( material );
            this.updateUniforms( programInfo, material, camera, model, lightManager, fog );
            this.context.bindVertexArray( vao );

            const { drawMode, instanceCount } = material;
            const {
                indices, numElements, elementType, offset,
            } = primitive.bufferInfo;
            const isIndexed = ( indices || elementType );
            const drawFun = `draw${isIndexed ? 'Elements' : 'Arrays'}${( typeof instanceCount === 'number' ) ? 'Instanced' : ''}`;

            if ( isIndexed )
                this.context[ drawFun ]( drawMode, numElements, elementType, offset * indices.data.BYTES_PER_ELEMENT, instanceCount );
            else
                this.context[ drawFun ]( drawMode, offset, numElements, instanceCount );

            this.context.bindVertexArray( null );

            return this;

        } );

    },

    render( model, camera, lightManager, fog ) {

        this.preRender( model, lightManager, fog );
        this.renderModel( camera, lightManager, fog );

        return this;

    },

} );

Object.defineProperties( WebGL2Renderer.prototype, {

    uniformObj: {

        get() {

            return this._uniformObj;

        },

    },

} );

export { WebGL2Renderer };
