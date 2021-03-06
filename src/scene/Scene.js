import { createFramebufferInfo, bindFramebufferInfo, resizeFramebufferInfo } from '../renderer/framebuffer';
import { Quad } from '../model/Primatives';
import { ScreenQuadShader } from '../shader/ScreenQuadShader';
import { BufferPicker } from '../controls/BufferPicker';
import { Controler } from '../controls/Controler';
import { Node } from './Node';

function Scene( renderer, controler ) {

    this.models = [];
    this.shaders = [];
    this.shadersMap = [];
    this.helpers = [];
    this.helpersMap = [];
    this._currentCamera = null;
    this.cameras = [];

    this.root = new Node( 'root_node' );
    this.renderer = renderer;
    this.gl = this.renderer.context;
    this.canvas = this.gl.canvas;
    this.controler = controler || new Controler( this.gl.canvas );
    this.quad2UnitModel = Quad.createModel( 'screenQuad', 2 );
    this.ScreenQuadShader = new ScreenQuadShader( this.gl ).setDefines( 'FXAA' ).setUniformObj( { u_resolution: [ this.gl.canvas.width, this.gl.canvas.height ] } );

    const defaultAttachment = [
        {
            format: this.gl.RGBA, type: this.gl.UNSIGNED_BYTE, minMag: this.gl.LINEAR, wrap: this.gl.CLAMP_TO_EDGE,
        },
        {
            format: this.gl.RGBA, type: this.gl.UNSIGNED_BYTE, minMag: this.gl.LINEAR, wrap: this.gl.CLAMP_TO_EDGE,
        },
        { format: this.gl.DEPTH_STENCIL },
    ];

    this.attachments = defaultAttachment;
    this.framebufferInfo = createFramebufferInfo( this.gl, this.attachments );
    this.bufferPicker = new BufferPicker( this.gl, this.models, this.framebufferInfo, this.controler, 1 );

    this.setPick( false );

}

Object.defineProperties( Scene.prototype, {

    currentCamera: {

        get() {

            return this._currentCamera;

        },

        set( camera ) {

            this.setCamera( camera );

        },

    },

} );

Object.assign( Scene.prototype, {

    add( ...objs ) {

        for ( let i = 0; i < objs.length; i ++ )
            if ( Array.isArray( objs[ i ] ) )
                this.add( ...objs[ i ] );
            else {

                if ( objs[ i ].shader )
                    this.addModelToShader( objs[ i ].shader, objs[ i ].model );
                if ( objs[ i ].helper )
                    this.addDataToHelper( objs[ i ].helper, objs[ i ].data );
                if ( objs[ i ].camera )
                    this.addCamera( objs[ i ].camera );

            }

        return this;

    },

    addModelToShader( shader, model ) {

        if ( Array.isArray( model ) )
            model.forEach( m => this.addModelToShader( shader, m ) );
        else {

            if ( model instanceof Node )
                return this.addNodeToShader( shader, model );

            const shaderIdx = this.shadersMap.indexOf( shader );
            let modelIdx = - 1;
            if ( shaderIdx > - 1 ) {

                modelIdx = this.shaders[ shaderIdx ].models.indexOf( model );
                if ( modelIdx < 0 )
                    this.shaders[ shaderIdx ].models.push( model );

            } else {

                const shaderObj = { shader: this.enablePick ? shader.setDefines( 'ColorPick' ) : shader, models: [ model ] };
                this.shaders.push( shaderObj );
                this.shadersMap.push( shader );

            }

            modelIdx = this.models.indexOf( model );
            if ( modelIdx < 0 ) {

                this.models.push( model );
                this.root.addChild( model );
                if ( this.enablePick )
                    model.setUniformObj( { u_colorId: this.bufferPicker.id2Color( this.models.length ) } );

            }

        }

        return this;

    },

    addNodeToShader( shader, node ) {

        const models = [];
        const cameras = [];
        function getTargets( nodep ) {

            if ( nodep.model )
                models.push( nodep.model );

            if ( nodep.camera )
                cameras.push( nodep.camera );

        }
        node.traverse( getTargets );

        let shaderIdx = this.shadersMap.indexOf( shader );
        if ( shaderIdx < 0 ) {

            const shaderObj = { shader: this.enablePick ? shader.setDefines( 'ColorPick' ) : shader, models: [] };
            this.shaders.push( shaderObj );
            this.shadersMap.push( shader );
            shaderIdx = this.shaders.length - 1;

        }

        const shaderModels = this.shaders[ shaderIdx ].models;
        for ( let i = 0; i < models.length; i ++ ) {

            const model = models[ i ];
            let modelIdx = shaderModels.indexOf( model );
            if ( modelIdx < 0 )
                shaderModels.push( model );

            modelIdx = this.models.indexOf( model );
            if ( modelIdx < 0 ) {

                this.models.push( model );
                if ( this.enablePick )
                    model.setUniformObj( { u_colorId: this.bufferPicker.id2Color( this.models.length ) } );

            }

        }

        this.root.addChild( node );
        this.addCamera( cameras );

        return this;

    },

    addDataToHelper( helper, data ) {

        if ( Array.isArray( data ) )
            data.forEach( d => this.addDataToHelper( helper, d ) );
        else {

            const helperIdx = this.helpersMap.indexOf( helper );
            if ( helperIdx > - 1 )
                this.helpers[ helperIdx ].datas.push( data );
            else {

                const helperObj = { helper, datas: [ data ] };
                this.helpers.push( helperObj );
                this.helpersMap.push( helper );

            }

        }

        return this;

    },

    addCamera( camera ) {

        if ( Array.isArray( camera ) )
            camera.forEach( c => this.addCamera( c ) );
        else {

            if ( ! camera.isCamera ) return this;
            const idx = this.cameras.indexOf( camera );
            if ( idx < 0 ) {

                this.cameras.push( camera );
                const cameraNode = this.root.findInChildren( 'camera', camera );
                if ( ! cameraNode )
                    this.root.addChild( camera );
                const node = camera.node;
                node.afterUpdateMatrix.push( {
                    type: 'camera',
                    cameraName: camera.name,
                    handler: camera.updateViewMatFromModelMat.bind( camera ),
                    trigerNodes: [ node ],
                } );

            }

            if ( ! this._currentCamera )
                this._currentCamera = camera.updateProjMatrix( this.canvas.width / this.canvas.height );

        }

        return this;

    },

    setCamera( camera ) {

        let cameraObj;
        if ( camera && camera.isCamera ) {

            this.addCamera( camera );
            cameraObj = camera;

        } else if ( camera instanceof Node && camera.camera ) {

            this.addCamera( camera.camera );
            cameraObj = camera.camera;

        }
        if ( cameraObj )
            this._currentCamera = cameraObj.updateProjMatrix( this.canvas.width / this.canvas.height );
        return this;

    },

    remove( ...objs ) {

        for ( let i = 0; i < objs.length; i ++ )
            if ( Array.isArray( objs[ i ] ) )
                this.remove( ...objs[ i ] );
            else {

                if ( objs[ i ].shader )
                    this.removeModelFromShader( objs[ i ].shader, objs[ i ].model );
                if ( objs[ i ].helper )
                    this.removeDataFromHelper( objs[ i ].helper, objs[ i ].data );

            }

        return this;

    },

    removeModelFromShader( shader, model ) {

        if ( Array.isArray( model ) )
            model.forEach( m => this.removeModelFromShader( shader, m ) );
        else {

            if ( model instanceof Node )
                return this.removeNodeFromShader( shader, model );

            const shaderIdx = this.shadersMap.indexOf( shader );
            let modelIdx = - 1;
            if ( shaderIdx > - 1 ) {

                modelIdx = this.shaders[ shaderIdx ].models.indexOf( model );
                if ( modelIdx > - 1 )
                    this.shaders[ shaderIdx ].models.splice( modelIdx, 1 );
                if ( this.shaders[ shaderIdx ].models.length < 1 ) {

                    this.shaders.splice( shaderIdx, 1 );
                    this.shadersMap.splice( shaderIdx, 1 );

                }

            }

            modelIdx = this.models.indexOf( model );
            if ( modelIdx > - 1 ) {

                this.models.splice( modelIdx, 1 );
                if ( model.node.parent === this.root )
                    this.root.remove( model.node );
                if ( this.enablePick )
                    this.needUpdateColorId = true;

            }

        }

        return this;

    },

    removeNodeFromShader( shader, node ) {

        const models = [];
        const cameras = [];
        function getTargets( nodep ) {

            if ( nodep.model )
                models.push( nodep.model );

            if ( nodep.camera )
                cameras.push( nodep.camera );

        }

        if ( Array.isArray( node ) )
            node.forEach( n => this.removeNodeFromShader( shader, n ) );
        else {

            node.traverse( getTargets );
            this.removeModelFromShader( shader, models );
            this.removeCamera( cameras );
            Node.remove( node );

        }

        return this;

    },

    removeCamera( camera ) {

        if ( Array.isArray( camera ) )
            camera.forEach( c => this.removeCamera( c ) );
        else {

            const idx = this.cameras.indexOf( camera );
            if ( idx > - 1 ) {

                this.cameras.splice( idx, 1 );
                if ( this.currentCamera === camera )
                    this.setCamera( this.cameras[ 0 ] );

            }

        }

        return this;

    },

    removeDataFromHelper( helper, data ) {

        if ( Array.isArray( data ) )
            data.forEach( d => this.removeDataFromHelper( helper, d ) );
        else {

            const helperIdx = this.helpersMap.indexOf( helper );
            if ( helperIdx > - 1 ) {

                const dataIdx = this.helpers[ helperIdx ].datas.indexOf( data );
                if ( dataIdx > - 1 )
                    this.helpers[ helperIdx ].datas.splice( dataIdx, 1 );

            }

        }

        return this;

    },

    render2Buffer( resize ) {

        if ( resize ) {

            resizeFramebufferInfo( this.gl, this.framebufferInfo, this.attachments );
            this.ScreenQuadShader.setUniformObj( { u_resolution: [ this.gl.canvas.width, this.gl.canvas.height ] } );

        }
        bindFramebufferInfo( this.gl, this.framebufferInfo );
        this.renderer.clear();
        this.render();
        bindFramebufferInfo( this.gl, null );
        return this;

    },

    render2Screen( attachment = 0 ) {

        this.ScreenQuadShader.setTexture( this.framebufferInfo.attachments[ attachment ] ).renderModel( this.quad2UnitModel );
        return this;

    },

    render() {

        this.root.updateMatrix();

        if ( this.enablePick && this.needUpdateColorId ) {

            this.models.forEach( ( m, id ) => m.setUniformObj( { u_colorId: id + 1 } ) );
            this.needUpdateColorId = false;

        }

        let curShader;
        let curShaderObj;
        let curModel;
        for ( let i = 0; i < this.shaders.length; i ++ ) {

            curShaderObj = this.shaders[ i ];
            curShader = curShaderObj.shader;

            for ( let j = 0; j < curShaderObj.models.length; j ++ ) {

                curModel = curShaderObj.models[ j ];
                curShader.setCamera( this.currentCamera ).renderModel( curModel );

            }

            curShader.deactivate();

        }

        for ( let i = 0; i < this.helpers.length; i ++ ) {

            curShaderObj = this.helpers[ i ];
            curShader = curShaderObj.helper;
            for ( let j = 0; j < curShaderObj.datas.length; j ++ ) {

                curModel = curShaderObj.datas[ j ];
                if ( curModel.data ) {

                    curShader.setData( curModel.data );

                    if ( curModel.transform )
                        curShader.model.setTransform( curModel.transform );

                    if ( curModel.position )
                        curShader.model.setPosition( curModel.position );

                    if ( curModel.rotation )
                        curShader.model.setRotation( curModel.rotation );

                    if ( curModel.scale )
                        curShader.model.setScale( curModel.scale );

                    curShader.setCamera( this.currentCamera ).render();

                }

            }


        }

    },

    setPick( enable ) {

        if ( !! enable === this.enablePick ) return this;

        if ( enable ) {

            this.shadersMap.forEach( shader => shader.setDefines( 'ColorPick' ) );
            this.models.forEach( ( m, idx ) => m.setUniformObj( { u_colorId: this.bufferPicker.id2Color( idx + 1 ) } ) );

        }

        if ( ! enable )
            this.shadersMap.forEach( shader => shader.setDefines() );

        this.enablePick = !! enable;
        this.bufferPicker.setActivate( this.enablePick );
        return this;

    },

    removeAll() {

        this.models = [];
        this.shaders = [];
        this.shadersMap = [];
        this.helpers = [];
        this.helpersMap = [];
        let camera = null;
        const removeNodes = [];
        this.root.children.forEach( ( c ) => {

            if ( ! c.camera )
                removeNodes.push( c );
            else
                camera = c.camera;

        } );
        removeNodes.forEach( n => Node.remove( n ) );
        this.setCamera( camera );
        return this;

    },

} );

export { Scene };
