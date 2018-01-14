import { ColorpickShader } from '../shader/ColorpickShader';
import { createFramebufferInfo, bindFramebufferInfo, readPixcelFromFrameBufferInfo } from '../renderer/framebuffer';
import { clear } from '../renderer/webgl';

function FramebufferPicker( gl, camera ) {

    this.gl = gl;
    this.canvas = gl.canvas;
    this.shader = new ColorpickShader( gl, camera );
    this.models = [];
    this.blankColor = this.id2Color( this.blankId );
    this.framebufferInfo = createFramebufferInfo( gl );
    this.flag = 0;

    const self = this;
    this.updateCanvasParam();
    this.isActive = false;
    this.mousedown = function () {

        self.flag = 0;

    };
    this.mousemove = function () {

        self.flag = 1;

    };
    this.mouseup = function ( e ) {

        if ( self.flag === 0 && self.isActive ) {

            const x = e.pageX - self.offsetX;
            const y = e.pageY - self.offsetY;
            self.needPick = true;
            self.pickx = x;
            self.picky = y;

        }

    };

    this.canvas.addEventListener( 'mousedown', this.mousedown, false );
    this.canvas.addEventListener( 'mousemove', this.mousemove, false );
    this.canvas.addEventListener( 'mouseup', this.mouseup, false );

}

Object.assign( FramebufferPicker.prototype, {

    blankId: 0,

    id2Color( id ) {

        const a = new Float32Array( 3 );
        a[ 0 ] = ( id & 0xff ) / 255.0;
        a[ 1 ] = ( ( id & 0xff00 ) >> 8 ) / 255.0;
        a[ 2 ] = ( ( id & 0xff0000 ) >> 16 ) / 255.0;
        return a;

    },

    color2Id( colorArray ) {

        return colorArray[ 0 ] | ( colorArray[ 1 ] << 8 ) | ( colorArray[ 2 ] << 16 );

    },

    addModels( ...models ) {

        for ( let i = 0; i < models.length; i ++ )
            if ( Array.isArray( models[ i ] ) )
                models[ i ].forEach( ele => this.addModels( ele ) );
            else
                this.models.push( models[ i ] );

        return this;

    },

    removeModels( ...models ) {

        let index = - 1;
        models.forEach( ( model ) => {

            index = this.models.indexOf( model );
            if ( index > - 1 )
                this.models.splice( index, 1 );

        } );

        return this;

    },

    clear() {

        bindFramebufferInfo( this.gl, this.framebufferInfo );
        clear( this.gl );
        bindFramebufferInfo( this.gl, null );

        return this;

    },

    render() {

        bindFramebufferInfo( this.gl, this.framebufferInfo );
        this.shader.updateCamera();
        this.models.forEach( ( model, index ) => {

            this.shader.setColor( this.id2Color( index + 1 ) ).renderModel( model );

        } );
        bindFramebufferInfo( this.gl, null );

        return this;

    },

    pick( x, y ) {

        const p = readPixcelFromFrameBufferInfo( this.gl, this.framebufferInfo, x, this.gl.canvas.height - y );
        console.log( x, y, p, this.color2Id( p ), this.models[ this.color2Id( p ) - 1 ] );

    },

    updateCanvasParam() {

        const box = this.canvas.getBoundingClientRect();
        this.offsetX = box.left;
        this.offsetY = box.top;
        return this;

    },

    dispose() {

        this.canvas.removeEventListener( 'mousedown', this.mousedown, false );
        this.canvas.removeEventListener( 'mousemove', this.mousemove, false );
        this.canvas.removeEventListener( 'mouseup', this.mouseup, false );
        return this;

    },

    update() {

        if ( this.needPick ) {

            this.clear().render();
            this.pick( this.pickx, this.picky );
            this.needPick = false;

        }

        return this;

    },

    activate() {

        this.isActive = true;
        this.updateCanvasParam();
        return this;

    },

    deactivate() {

        this.isActive = false;
        return this;

    },

} );

export { FramebufferPicker };
